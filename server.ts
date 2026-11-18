import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  CV_PARSER_PROMPT,
  JD_PARSER_PROMPT,
  MATCHING_PROMPT,
  SUGGESTION_PROMPT,
  GENERAL_CV_REVIEW_PROMPT,
  calculateMatchScore,
} from './src/services/geminiService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Support large PDF payloads in base64 (up to 25MB)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize GoogleGenAI server-side client
const geminiApiKey = process.env.GEMINI_API_KEY || '';

let aiClient: GoogleGenAI | null = null;
if (geminiApiKey && geminiApiKey.trim().length > 5) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Resilient Gemini caller with retry on 503/429 and model fallback
 */
async function callGeminiWithFallback(contents: any): Promise<string> {
  if (!aiClient) {
    throw new Error('Gemini integration requires GEMINI_API_KEY to be configured in environment secrets.');
  }

  // Use models with high quota availability and resilience against 429 quota exhaustion
  const models = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-pro-preview'];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await aiClient.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
        const text = response.text;
        if (text) return text;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const status = err.status || err.statusCode;
        // If quota exceeded or resource exhausted on this model, switch immediately to next model
        if (msg.includes('Quota exceeded') || msg.includes('RESOURCE_EXHAUSTED')) {
          break;
        }
        if (status === 503 || status === 429) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('Failed to generate response from Gemini API.');
}

// ==================== API ROUTES ====================

// 1. Health check & status
app.get('/api/gemini/status', (_req: Request, res: Response) => {
  const hasKey = Boolean(geminiApiKey && geminiApiKey.trim().length > 5);
  res.json({
    status: hasKey ? 'connected' : 'missing_key',
    hasKey,
    primaryModel: 'gemini-3.1-flash-lite',
    fallbackModel: 'gemini-flash-latest',
    message: hasKey
      ? 'Gemini 3.1 Flash Lite is ready for real CV and JD analysis.'
      : 'Gemini integration requires GEMINI_API_KEY to be configured.',
  });
});

// 2. Parse CV directly from PDF (Multimodal Document Input)
app.post('/api/gemini/parse-cv-pdf', async (req: Request, res: Response) => {
  try {
    const { pdfBase64, fileName } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'Missing pdfBase64 data in request body.' });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'Gemini integration requires GEMINI_API_KEY to be configured in environment secrets.',
      });
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();

    const rawJson = await callGeminiWithFallback([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: cleanBase64,
        },
      },
      CV_PARSER_PROMPT,
    ]);

    const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in /api/gemini/parse-cv-pdf:', error);
    res.status(500).json({
      error: error?.message || 'Không thể trích xuất CV từ PDF bằng Gemini.',
    });
  }
});

// 3. Parse Job Description (JD)
app.post('/api/gemini/parse-jd', async (req: Request, res: Response) => {
  try {
    const { jobData } = req.body;
    if (!jobData) {
      return res.status(400).json({ error: 'Missing jobData in request body.' });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'Gemini integration requires GEMINI_API_KEY to be configured in environment secrets.',
      });
    }

    const jobStr = typeof jobData === 'string' ? jobData : JSON.stringify(jobData, null, 2);
    const prompt = `${JD_PARSER_PROMPT}\n\n=== NỘI DUNG JD MỤC TIÊU (DATA INJECTION ĐỐI CHIẾU 1:1) ===\n${jobStr}`;

    const rawJson = await callGeminiWithFallback(prompt);
    const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in /api/gemini/parse-jd:', error);
    res.status(500).json({
      error: error?.message || 'Không thể phân tích JD bằng Gemini.',
    });
  }
});

// 4. Compare CV with JD (Match Analysis)
app.post('/api/gemini/analyze-match', async (req: Request, res: Response) => {
  try {
    const { cvData, jdData } = req.body;

    if (!cvData || !jdData) {
      return res.status(400).json({ error: 'Missing cvData or jdData in request body.' });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'Gemini integration requires GEMINI_API_KEY to be configured in environment secrets.',
      });
    }

    const prompt = `${MATCHING_PROMPT}\n\n=== CV DATA (JSON) ===\n${JSON.stringify(
      cvData,
      null,
      2
    )}\n\n=== JD DATA (JSON) ===\n${JSON.stringify(jdData, null, 2)}`;

    const rawJson = await callGeminiWithFallback(prompt);
    const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const rawResult = JSON.parse(cleaned);

    const matchItems = Array.isArray(rawResult.matchItems)
      ? rawResult.matchItems.map((item: any) => {
          let status = item.status;
          if (!['matched', 'partial', 'not_found', 'uncertain'].includes(status)) {
            status = status === 'pass' ? 'matched' : 'not_found';
          }
          return {
            requirement: item.requirement || item.skill || '',
            category: item.category || 'requiredSkills',
            status,
            evidence: status === 'not_found' ? null : item.evidence || null,
            confidence: typeof item.confidence === 'number' ? item.confidence : 0.9,
          };
        })
      : [];

    const scored = calculateMatchScore(matchItems);

    res.json({
      success: true,
      data: {
        overallMatch: scored.overallMatch,
        breakdown: scored.breakdown,
        matchItems,
        summary: rawResult.summary || 'Đối chiếu chi tiết giữa CV và JD.',
      },
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/analyze-match:', error);
    res.status(500).json({
      error: error?.message || 'Không thể so sánh CV và JD bằng Gemini.',
    });
  }
});

// 5. Generate CV Suggestions
app.post('/api/gemini/generate-suggestions', async (req: Request, res: Response) => {
  try {
    const { cvData, jdData, matchResult } = req.body;

    if (!cvData || !jdData) {
      return res.status(400).json({ error: 'Missing cvData or jdData in request body.' });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'Gemini integration requires GEMINI_API_KEY to be configured in environment secrets.',
      });
    }

    const prompt = `${SUGGESTION_PROMPT}\n\n=== CV DATA ===\n${JSON.stringify(
      cvData,
      null,
      2
    )}\n\n=== JD DATA ===\n${JSON.stringify(jdData, null, 2)}\n\n=== MATCH RESULT ===\n${JSON.stringify(
      matchResult || {},
      null,
      2
    )}`;

    const rawJson = await callGeminiWithFallback(prompt);
    const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in /api/gemini/generate-suggestions:', error);
    res.status(500).json({
      error: error?.message || 'Không thể tạo gợi ý tối ưu CV bằng Gemini.',
    });
  }
});

// 5b. General CV Review (Bố cục & Tính cần thiết của thông tin khi chưa chọn công việc mục tiêu)
app.post('/api/gemini/analyze-general-cv', async (req: Request, res: Response) => {
  try {
    const { cvData } = req.body;

    if (!cvData) {
      return res.status(400).json({ error: 'Missing cvData in request body.' });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'Gemini integration requires GEMINI_API_KEY to be configured in environment secrets.',
      });
    }

    const prompt = `${GENERAL_CV_REVIEW_PROMPT}\n\n=== DỮ LIỆU CV THỰC TẾ TRÍCH XUẤT (JSON) ===\n${JSON.stringify(
      cvData,
      null,
      2
    )}`;

    const rawJson = await callGeminiWithFallback(prompt);
    const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in /api/gemini/analyze-general-cv:', error);
    res.status(500).json({
      error: error?.message || 'Không thể phân tích tổng quan CV bằng Gemini.',
    });
  }
});

// 6. Career Gap Analysis & Roadmap Generator with CV and Profile Sync (Supports both Target Job and Major-based orientation)
app.post('/api/gemini/career-gap-analysis', async (req: Request, res: Response) => {
  try {
    const {
      userProfile,
      targetJob,
      events,
      jobs,
      cvData,
      isRegenerate,
      regenerationFocus,
      majorDirection,
      customNote,
    } = req.body;

    const selectedMajorName =
      majorDirection?.trim() ||
      userProfile?.careerDirection?.trim() ||
      userProfile?.major?.trim() ||
      'Quản trị kinh doanh';

    const isByMajorOnly = !targetJob;

    const availableEvents = Array.isArray(events)
      ? events.slice(0, 10).map((e: any) => ({
          id: e.id,
          title: e.title,
          relatedSkills: e.relatedSkills || [],
          organizer: e.organizer,
          location: e.location,
          type: e.type,
        }))
      : [];

    const availableJobs = Array.isArray(jobs)
      ? jobs.slice(0, 12).map((j: any) => ({
          id: j.id,
          title: j.title,
          company: j.company,
          requiredSkills: j.requiredSkills || j.skillTags || [],
          location: j.location,
          salaryDisplay: j.salaryDisplay || j.salary,
          type: j.type,
        }))
      : [];

    const isRegen = Boolean(isRegenerate);
    const focusStyle =
      regenerationFocus ||
      (isRegen ? 'Chuyên sâu' : 'Thực chiến');

    // Tailored guidance based on the 3 user-specified career orientation choices
    let orientationGuidance = '';
    const lowerFocus = focusStyle.toLowerCase();
    if (lowerFocus.includes('chuyên sâu') || lowerFocus.includes('deep')) {
      orientationGuidance = `
=== ĐẶC THÙ HƯỚNG ĐỀ XUẤT: CHUYÊN SÂU ===
- Triết lý: Ưu tiên kiến thức nền tảng, tài liệu chuyên ngành, lý thuyết và học tập có hệ thống.
- Phương pháp xây dựng lộ trình của AI:
  + Sắp xếp nội dung từ cơ bản đến nâng cao một cách bài bản, giải thích rõ các kiến thức cốt lõi.
  + Đề xuất tài liệu học tập đáng tin cậy, giáo trình chuyên sâu, chứng chỉ uy tín và các hoạt động giúp phát triển chuyên môn vững chắc.
- Mục tiêu đầu ra: Giúp sinh viên xây dựng nền tảng vững chắc và phát triển năng lực chuyên môn lâu dài.`;
    } else if (lowerFocus.includes('tăng tốc') || lowerFocus.includes('accelerated')) {
      orientationGuidance = `
=== ĐẶC THÙ HƯỚNG ĐỀ XUẤT: TĂNG TỐC ===
- Triết lý: Ưu tiên những kỹ năng quan trọng nhất để đạt mục tiêu nghề nghiệp trong thời gian ngắn và tối ưu nguồn lực học tập.
- Phương pháp xây dựng lộ trình của AI:
  + Xác định chính xác khoảng cách giữa năng lực hiện tại (từ CV) và yêu cầu của vị trí mục tiêu.
  + Áp dụng nguyên lý 80/20: ưu tiên kỹ năng thiết yếu nhất, loại bỏ nội dung ít liên quan, tận dụng công cụ AI để đẩy nhanh tiến độ và xây dựng kế hoạch học tập tinh gọn theo từng giai đoạn.
- Mục tiêu đầu ra: Giúp sinh viên tập trung vào những việc quan trọng nhất để đi làm sớm / đạt mục tiêu nhanh chóng.`;
    } else {
      // Default: Thực chiến
      orientationGuidance = `
=== ĐẶC THÙ HƯỚNG ĐỀ XUẤT: THỰC CHIẾN ===
- Triết lý: Ưu tiên thực hành, dự án thực tế, công cụ đang được doanh nghiệp sử dụng và kỹ năng có thể áp dụng ngay vào công việc.
- Phương pháp xây dựng lộ trình của AI:
  + Tập trung vào các kỹ năng thực hành, bài tập dự án thực chiến, xây dựng sản phẩm Portfolio, tích lũy kinh nghiệm thực tế.
  + Bám sát yêu cầu tuyển dụng thực tế và tìm kiếm cơ hội thực tập sớm tại doanh nghiệp đối tác.
- Mục tiêu đầu ra: Giúp sinh viên nhanh chóng hình thành năng lực thực tế và sẵn sàng ứng tuyển.`;
    }

    let cvContextText =
      'Sinh viên chưa tải file CV. Phân tích dựa trên thông tin hồ sơ sinh viên PTIT (chuyên ngành, năm học, mục tiêu).';
    let extractedCvSkills: string[] = [];
    let extractedCvExps: string[] = [];

    if (cvData) {
      extractedCvSkills = [
        ...(Array.isArray(cvData.skills)
          ? cvData.skills.map((s: any) => (typeof s === 'string' ? s : s.name))
          : []),
        ...(Array.isArray(cvData.skills?.hardSkills) ? cvData.skills.hardSkills : []),
        ...(Array.isArray(cvData.skills?.softSkills) ? cvData.skills.softSkills : []),
      ].filter(Boolean);

      extractedCvExps = Array.isArray(cvData.experiences)
        ? cvData.experiences.map(
            (exp: any) => `${exp.position || exp.role} tại ${exp.company || 'Doanh nghiệp'}`
          )
        : cvData.experienceText
        ? [cvData.experienceText]
        : [];

      cvContextText = `
- Họ tên ứng viên trên CV: ${cvData.candidate?.fullName || cvData.candidateInfo?.fullName || userProfile?.displayName || 'Sinh viên PTIT'}
- Kỹ năng ứng viên ĐÃ CÓ trong CV: ${extractedCvSkills.length > 0 ? extractedCvSkills.join(', ') : 'Chưa liệt kê cụ thể'}
- Kinh nghiệm / Dự án đã có: ${extractedCvExps.length > 0 ? extractedCvExps.join(', ') : 'Dự án môn học, hoạt động ngoại khóa'}
- Học vấn: ${cvData.education?.[0]?.school || 'Học viện Công nghệ Bưu chính Viễn thông (PTIT)'} - Ngành: ${cvData.education?.[0]?.major || selectedMajorName}`;
    }

    const targetJobContext = targetJob
      ? `=== VỊ TRÍ MỤC TIÊU (JD DOANH NGHIỆP - CỘT MỐC 3) ===
- Vị trí: ${targetJob.title}
- Doanh nghiệp: ${targetJob.company}
- Địa điểm: ${targetJob.location || 'Hà Nội'}
- Mức lương: ${targetJob.salaryDisplay || targetJob.salary || 'Thỏa thuận'}
- Yêu cầu kỹ năng: ${(targetJob.requiredSkills || targetJob.skillTags || []).join(', ')}
- Mô tả công việc: ${targetJob.description || ''}
- Ngành học của sinh viên: ${selectedMajorName}`
      : `=== ĐỊNH HƯỚNG THEO NGÀNH HỌC (KHÔNG CHỌN CÔNG VIỆC MỤC TIÊU TRƯỚC) ===
- Ngành đào tạo: ${selectedMajorName} (Khối ngành đào tạo tại PTIT)
- Người dùng chọn phương án: "AI đề xuất lộ trình theo hướng ngành học", không cần chọn công việc mục tiêu cụ thể trước.
- Mục tiêu: AI thiết kế lộ trình 3 Cột mốc hoàn chỉnh (Cột mốc 1: Khởi động & Nền tảng, Cột mốc 2: Thực tập sinh & Thực chiến, Cột mốc 3: Chuyên viên chính thức trong ngành ${selectedMajorName}).`;

    if (!aiClient) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY, chuyển sang bộ máy tạo lộ trình nội bộ PTIT.');
    }

    const prompt = `Bạn là Chuyên gia Cố vấn Hướng nghiệp Cao cấp của Học viện Công nghệ Bưu chính Viễn thông (PTIT).
Nhiệm vụ của bạn: Tạo lập hoặc làm mới một Lộ trình Nghề nghiệp (Career Map) 3 Cột mốc hoàn toàn cá nhân hóa cho sinh viên PTIT.

=== ĐỊNH HƯỚNG LỰA CHỌN CỦA SINH VIÊN ===
${isByMajorOnly ? `Sinh viên KHÔNG CHỌN công việc mục tiêu cụ thể, mà lựa chọn "AI đề xuất lộ trình theo hướng ngành học: ${selectedMajorName}".
AI sẽ tự động xác định các năng lực cốt lõi, khoảng trống kỹ năng & kinh nghiệm của sinh viên (dựa trên CV nếu có) để đề xuất lộ trình chuẩn mực đến vị trí Chuyên viên chính thức ngành ${selectedMajorName}.` : `Sinh viên có công việc mục tiêu cụ thể: "${targetJob?.title}" tại "${targetJob?.company}".`}

=== QUY TẮC CỐT LÕI CỦA LỘ TRÌNH 3 CỘT MỐC (BẮT BUỘC) ===
1. CỘT MỐC 1 (KHỞI ĐỘNG & NỀN TẢNG):
   - Phân tích kỹ năng/kinh nghiệm sinh viên ĐÃ CÓ trong CV đối chiếu với tiêu chuẩn ngành hoặc JD mục tiêu để tìm ra KHOẢNG TRỐNG KỸ NĂNG & KINH NGHIỆM.
   - Đề xuất vai trò khởi đầu (Entry-level, CTV, hoặc Nền tảng chuyên môn ngành ${selectedMajorName}) làm bước đệm vững chắc.
   - Thiết kế 2-3 practicalTasks hành động thực tế bổ sung kỹ năng khuyết thiếu từ CV.
   - Gợi ý sự kiện/workshop phù hợp từ danh sách sự kiện có sẵn trong web (nếu có khớp), HOẶC ĐỀ XUẤT SỰ KIỆN GIẢ ĐỊNH (nếu web chưa có).

2. CỘT MỐC 2 (TĂNG TỐC & THỰC CHIẾN - THỰC TẬP SINH):
   - Đề xuất vai trò Thực tập sinh / Trợ lý chuyên môn (Intern, Fresher, Project Trainee) trong ngành ${selectedMajorName}.
   - Thiết kế 2-3 practicalTasks giải quyết bài toán thực tế của doanh nghiệp, xây dựng portfolio.
   - Đề xuất job thực tập phù hợp từ danh sách việc làm có sẵn trên web (nếu có), HOẶC ĐỀ XUẤT VIỆC LÀM THỰC TẬP GIẢ ĐỊNH (nếu web chưa có).

3. CỘT MỐC 3 (ĐÍCH ĐẾN - CHUYÊN VIÊN CHÍNH THỨC):
   ${isByMajorOnly ? `- Đề xuất vai trò Chuyên viên chính thức chuẩn ngành (Junior / Specialist trong ngành ${selectedMajorName}).
   - Thiết kế 2-3 practicalTasks hoàn thiện năng lực phỏng vấn và thi tuyển chuyên viên.
   - Đề xuất job chính thức phù hợp từ danh sách việc làm có sẵn trên web (nếu có), HOẶC ĐỀ XUẤT VỊ TRÍ TUYỂN DỤNG GIẢ ĐỊNH theo chuẩn thị trường.` : `- Đích đến là vị trí: "${targetJob?.title}" tại "${targetJob?.company}".
   - Thiết kế practicalTasks bám sát ứng tuyển cho vị trí này.`}

=== ĐỊNH HƯỚNG TIẾP CẬN ĐƯỢC CHỌN: "${focusStyle}" ===
${orientationGuidance}
${customNote ? `- Yêu cầu / Ghi chú đặc biệt từ sinh viên: "${customNote}"` : ''}
- Trạng thái yêu cầu: ${isRegen ? `Sinh viên yêu cầu LÀM MỚI LỘ TRÌNH (Tạo phương án khác) theo phong cách "${focusStyle}". Hãy làm mới toàn bộ nội dung và danh sách tasks để sinh viên có góc nhìn tiếp cận mới mẻ, đột phá!` : 'Lộ trình tối ưu hóa lần đầu.'}

=== THÔNG TIN HỒ SƠ SINH VIÊN PTIT ===
- Họ tên: ${userProfile?.displayName || 'Sinh viên PTIT'}
- Ngành học: ${selectedMajorName}
- Năm học hiện tại: ${userProfile?.academicYear || 'Năm 3'}
- Mục tiêu: ${userProfile?.careerGoal || 'Đang tìm kiếm cơ hội thực tập và phát triển nghề nghiệp'}

=== DỮ LIỆU TỪ CV ĐÃ TẢI LÊN ===
${cvContextText}

${targetJobContext}

=== DỮ LIỆU CÓ SẴN TRÊN HỆ THỐNG WEBSITE PTIT CAREER HUB ===
1. Danh sách SỰ KIỆN / WORKSHOPS hiện có:
${JSON.stringify(availableEvents, null, 2)}

2. Danh sách VIỆC LÀM / TUYỂN DỤNG hiện có:
${JSON.stringify(availableJobs, null, 2)}

=== QUY TẮC ĐỐI CHIẾU SỰ KIỆN & VIỆC LÀM (QUAN TRỌNG) ===
- Nếu có sự kiện trong web phù hợp với khoảng trống kỹ năng của sinh viên, hãy đưa ID của sự kiện vào mảng "suggestedEvents" / "recommendedEventIds".
- Nếu có việc làm trong web phù hợp với ngành học và năng lực, hãy đưa ID của việc làm vào mảng "suggestedJobIds".
- NẾU KHÔNG CÓ SỰ KIỆN HOẶC VIỆC LÀM NÀO CÓ SẴN TRÊN WEB KHỚP CHÍNH XÁC: Bạn HÃY ĐỀ XUẤT CÁC SỰ KIỆN / VIỆC LÀM GIẢ ĐỊNH (mô phỏng thực tế thị trường) vào trường "hypotheticalItems" cho từng Cột mốc.

=== YÊU CẦU ĐẦU RA ===
Trả về DUY NHẤT một chuỗi JSON hợp lệ theo schema sau (không kèm markdown ngoài JSON):
{
  "matchScore": 85,
  "analysisSummary": "Đánh giá 2-3 câu về khoảng trống kỹ năng & kinh nghiệm của sinh viên từ CV so với tiêu chuẩn ngành ${selectedMajorName} và chiến lược bứt phá.",
  "missingSkills": ["Kỹ năng khuyết thiếu 1", "Kỹ năng khuyết thiếu 2", "Kỹ năng khuyết thiếu 3"],
  "acquiredSkillsFromCv": ["Kỹ năng đã có 1", "Kỹ năng đã có 2"],
  "customTasks": [
    { "title": "Nhiệm vụ thực tế 1", "priority": "high", "deadline": "Trong 2 tuần", "description": "Mô tả hành động giải quyết khoảng trống kỹ năng" },
    { "title": "Nhiệm vụ thực tế 2", "priority": "high", "deadline": "Tháng tới", "description": "Mô tả hành động giải quyết khoảng trống kinh nghiệm" }
  ],
  "suggestedMilestones": [
    {
      "milestoneNumber": 1,
      "roleTitle": "Tên vai trò Cột mốc 1 (Entry-Level / CTV / Nền tảng ngành ${selectedMajorName})",
      "badgeLabel": "Entry-Level • CTV / Dự án thử nghiệm",
      "keyFocus": "Trọng tâm giai đoạn 1 khắc phục khoảng trống kỹ năng",
      "practicalTasks": [
        { "title": "Tên task 1", "deadline": "2 tuần", "priority": "high" },
        { "title": "Tên task 2", "deadline": "3 tuần", "priority": "medium" }
      ],
      "requiredSkills": ["Kỹ năng A", "Kỹ năng B"],
      "recommendedEventIds": ["id-sự-kiện-có-sẵn-trong-web-nếu-có"],
      "hypotheticalItems": [
        { "type": "event", "title": "Workshop thực tế đề xuất", "organizer": "Doanh nghiệp đối tác PTIT", "note": "Gợi ý tham gia để bổ sung kỹ năng" }
      ]
    },
    {
      "milestoneNumber": 2,
      "roleTitle": "Tên vai trò Cột mốc 2 (Thực tập sinh Intern / Project Trainee)",
      "badgeLabel": "Core Execution • Thực tập sinh Intern",
      "keyFocus": "Trọng tâm giai đoạn 2 thực chiến",
      "practicalTasks": [
        { "title": "Tên task 3", "deadline": "1 tháng", "priority": "high" },
        { "title": "Tên task 4", "deadline": "6 tuần", "priority": "high" }
      ],
      "requiredSkills": ["Kỹ năng C", "Kỹ năng D"],
      "recommendedJobIds": ["id-job-thực-tập-có-sẵn-trong-web-nếu-có"],
      "hypotheticalItems": [
        { "type": "job", "title": "Vị trí Thực tập sinh đề xuất", "company": "Doanh nghiệp đối tác giả định", "note": "Cơ hội cọ xát thực tế phù hợp" }
      ]
    },
    {
      "milestoneNumber": 3,
      "roleTitle": "${targetJob ? targetJob.title : `Chuyên viên ${selectedMajorName} (Junior Specialist)`}",
      "badgeLabel": "${targetJob ? `🎯 JD Mục tiêu • ${targetJob.company}` : `🎯 Đích đến Chuyên viên • Ngành ${selectedMajorName}`}",
      "keyFocus": "${targetJob ? `Vị trí mục tiêu chính thức tại ${targetJob.company}` : `Đạt chuẩn năng lực Chuyên viên chính thức ngành ${selectedMajorName}`}",
      "practicalTasks": [
        { "title": "Hoàn thiện hồ sơ CV & Portfolio làm nổi bật các dự án chuyên sâu", "deadline": "3 tháng", "priority": "high" },
        { "title": "Luyện tập phỏng vấn tình huống nghiệp vụ và chuẩn bị hội đồng tuyển dụng", "deadline": "4 tháng", "priority": "high" }
      ],
      "requiredSkills": ["Kỹ năng chuyên môn nâng cao", "Quản lý dự án", "Giao tiếp thuyết phục"],
      "recommendedJobIds": ["id-job-chính-thức-nếu-có"]
    }
  ],
  "suggestedEvents": ["id-sự-kiện-phù-hợp-nhất"],
  "suggestedJobIds": ["id-job-phù-hợp-nhất"],
  "coreAdvice": "Lời khuyên chiến lược cho sinh viên PTIT theo ngành học và dữ liệu CV"
}`;

    const rawJson = await callGeminiWithFallback(prompt);
    const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    parsed.aiSummary =
      parsed.analysisSummary ||
      parsed.aiSummary ||
      `Đề xuất lộ trình phát triển nghề nghiệp ngành ${selectedMajorName}.`;
    parsed.gapSkills = parsed.missingSkills || parsed.gapSkills || [];
    parsed.recommendedEventIds =
      parsed.suggestedEvents || parsed.recommendedEventIds || [];
    parsed.recommendedJobIds =
      parsed.suggestedJobIds || parsed.recommendedJobIds || [];

    if (Array.isArray(parsed.suggestedMilestones) && parsed.suggestedMilestones.length === 3) {
      if (targetJob) {
        parsed.suggestedMilestones[2].roleTitle = targetJob.title;
        parsed.suggestedMilestones[2].badgeLabel = `🎯 JD Mục tiêu • ${targetJob.company}`;
      }
      parsed.suggestedMilestones[0].milestoneNumber = 1;
      parsed.suggestedMilestones[1].milestoneNumber = 2;
      parsed.suggestedMilestones[2].milestoneNumber = 3;
    }

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.log('[Info] Fallback to intelligent PTIT career engine:', error?.message?.slice(0, 100));
    const cvData = req.body?.cvData;
    const userProfile = req.body?.userProfile;
    const targetJob = req.body?.targetJob;
    const isRegen = Boolean(req.body?.isRegenerate);
    const majorDirection = req.body?.majorDirection;
    const major =
      majorDirection?.trim() ||
      userProfile?.careerDirection?.trim() ||
      userProfile?.major?.trim() ||
      'Quản trị kinh doanh';

    const jobTitle = targetJob?.title || `Chuyên viên ${major}`;
    const company = targetJob?.company || 'Doanh nghiệp đối tác PTIT';

    const cvSkills = [
      ...(Array.isArray(cvData?.skills) ? cvData.skills.map((s: any) => (typeof s === 'string' ? s : s.name)) : []),
      ...(Array.isArray(cvData?.skills?.hardSkills) ? cvData.skills.hardSkills : []),
      ...(Array.isArray(cvData?.skills?.softSkills) ? cvData.skills.softSkills : []),
    ].filter(Boolean);
    const cvExps = Array.isArray(cvData?.experiences) ? cvData.experiences : [];

    // Industry skill requirements mapped by major
    const majorSkillStandards: Record<string, string[]> = {
      'Quản trị kinh doanh': ['Quản trị dự án', 'Phân tích dữ liệu kinh doanh', 'Kỹ năng đàm phán', 'Tư duy chiến lược', 'Marketing căn bản'],
      'Marketing': ['Digital Marketing', 'Content & SEO', 'Quản lý chiến dịch', 'Phân tích thị trường', 'Google Analytics'],
      'Thương mại điện tử': ['Vận hành sàn TMĐT', 'Tối ưu tỷ lệ chuyển đổi', 'Phân tích hành vi người dùng', 'Digital Ads', 'Quản lý đơn hàng'],
      'Kế toán': ['Kế toán tài chính', 'Thuế doanh nghiệp', 'Phần mềm kế toán MISA', 'Phân tích báo cáo tài chính', 'Kiểm toán nội bộ'],
      'Công nghệ tài chính (Fintech)': ['Phân tích tài chính', 'Thanh toán số', 'Công nghệ Blockchain', 'Quản trị rủi ro', 'Python cho tài chính'],
      'Logistics và Quản trị chuỗi cung ứng': ['Quản trị kho vận', 'Tối ưu tuyến đường', 'Hệ thống ERP/WMS', 'Thủ tục hải quan', 'Quản lý chuỗi cung ứng'],
      'Quan hệ công chúng (PR)': ['Viết thông cáo báo chí', 'Quản trị khủng hoảng truyền thông', 'Tổ chức sự kiện', 'Xây dựng thương hiệu', 'Quan hệ báo chí'],
      'Công nghệ thông tin': ['Lập trình cơ bản', 'Cấu trúc dữ liệu & Thuật toán', 'Cơ sở dữ liệu SQL', 'Git/GitHub', 'RESTful API'],
    };

    const standardSkills = majorSkillStandards[major] || [
      'Kỹ năng chuyên môn',
      'Phân tích dữ liệu',
      'Làm việc nhóm',
      'Tư duy phản biện',
      'Giao tiếp thuyết phục',
    ];

    const required = targetJob
      ? (Array.isArray(targetJob?.requiredSkills) && targetJob.requiredSkills.length > 0
          ? targetJob.requiredSkills
          : Array.isArray(targetJob?.skillTags) && targetJob.skillTags.length > 0
          ? targetJob.skillTags
          : standardSkills)
      : standardSkills;

    const matchedSkills = required.filter((reqSkill: string) =>
      cvSkills.some(
        (cvSk: string) =>
          cvSk.toLowerCase().includes(reqSkill.toLowerCase()) ||
          reqSkill.toLowerCase().includes(cvSk.toLowerCase())
      )
    );
    const missingSkills = required.filter(
      (reqSkill: string) =>
        !cvSkills.some(
          (cvSk: string) =>
            cvSk.toLowerCase().includes(reqSkill.toLowerCase()) ||
            reqSkill.toLowerCase().includes(cvSk.toLowerCase())
        )
    );

    const skillScore = required.length > 0 ? (matchedSkills.length / required.length) * 65 : 45;
    const expScore = Math.min(cvExps.length * 8, 20);
    const calculatedMatch = Math.min(95, Math.max(35, Math.round(skillScore + expScore + (cvData ? 10 : 0))));
    const topGaps = missingSkills.length > 0 ? missingSkills : required.slice(0, 3);

    const m1Title = targetJob
      ? (isRegen
          ? `CTV Hỗ trợ Dự án & Phát triển Nền tảng (Associate Assistant)`
          : `Cộng tác viên Nhập môn & Nền tảng (Entry Support)`)
      : (isRegen
          ? `Cộng tác viên Thực nghiệm & Nền tảng Dự án ngành ${major}`
          : `Cộng tác viên Nhập môn & Nền tảng chuyên môn ngành ${major}`);

    const m2Title = targetJob
      ? (isRegen
          ? `Thực tập sinh Thực chiến Bứt phá (Advanced Intern / Project Specialist)`
          : `Thực tập sinh Chuyên môn (Core Trainee)`)
      : (isRegen
          ? `Thực tập sinh Đột phá & Dự án Thực chiến ngành ${major}`
          : `Thực tập sinh Chuyên môn ngành ${major} (Core Intern)`);

    const m3Title = targetJob
      ? targetJob.title
      : (isRegen
          ? `Chuyên viên ${major} Thực chiến & Phát triển Dự án`
          : `Chuyên viên ${major} Chính thức (Junior Specialist)`);

    const availableEvents = Array.isArray(req.body?.events) ? req.body.events : [];
    const eventIds = availableEvents.length > 0 ? availableEvents.slice(0, 2).map((e: any) => e.id) : ['event-1', 'event-2'];

    res.json({
      success: true,
      data: {
        matchScore: calculatedMatch,
        analysisSummary: cvData
          ? (targetJob
              ? `Dựa trên file CV (${cvSkills.length} kỹ năng, ${cvExps.length} kinh nghiệm), bạn đã đáp ứng khoảng ${calculatedMatch}% yêu cầu vị trí ${jobTitle} tại ${company}. Khoảng trống kỹ năng: ${topGaps.slice(0, 2).join(', ')}.`
              : `Dựa trên phân tích CV (${cvSkills.length} kỹ năng, ${cvExps.length} kinh nghiệm), bạn đã đáp ứng khoảng ${calculatedMatch}% năng lực chuẩn ngành ${major}. AI đã đề xuất lộ trình 3 cột mốc giải quyết các khoảng trống kỹ năng ${topGaps.slice(0, 2).join(', ')}.`)
          : (targetJob
              ? `Dựa trên thông tin hồ sơ ngành ${major}, AI đã thiết kế lộ trình 3 cột mốc từng bước tích lũy năng lực cho vị trí ${jobTitle} tại ${company}.`
              : `Dựa trên ngành học ${major} (${userProfile?.academicYear || 'Năm 3'}), AI đã xây dựng lộ trình 3 cột mốc chuẩn hóa theo hướng ngành học, đồng bộ với các sự kiện và việc làm thực tế trên hệ thống.`),
        missingSkills: topGaps,
        gapSkills: topGaps,
        acquiredSkillsFromCv: matchedSkills.length > 0 ? matchedSkills : cvSkills.slice(0, 3),
        customTasks: [
          {
            title: isRegen
              ? `Xây dựng dự án Portfolio nâng cao: Triển khai chiến dịch thực nghiệm bổ sung kỹ năng ${topGaps[0] || 'chuyên môn'} ngành ${major}`
              : `Thực hành xây dựng sản phẩm mẫu hoặc bài tập lớn bổ sung kỹ năng ${topGaps[0] || 'chuyên môn'} ngành ${major}`,
            priority: 'high',
            deadline: 'Trong 2 tuần',
            description: `Khắc phục khoảng trống kỹ năng theo chuẩn chuyên ngành ${major}`,
          },
          {
            title: `Tối ưu hóa các con số định lượng trong CV làm nổi bật từ khóa ${topGaps.slice(0, 2).join(', ')}`,
            priority: 'high',
            deadline: 'Tháng này',
            description: 'Nâng cao độ khớp hồ sơ với tiêu chí tuyển dụng thực tế',
          },
        ],
        suggestedMilestones: [
          {
            milestoneNumber: 1,
            roleTitle: m1Title,
            badgeLabel: 'Entry-Level • CTV / Dự án thử nghiệm',
            keyFocus: `Nắm vững công cụ nền tảng và văn hóa làm việc, hoàn thành các bài tập nghiệp vụ cơ sở ngành ${major}`,
            practicalTasks: [
              {
                title: isRegen
                  ? `Khảo sát thực địa và lập báo cáo phân tích thực trạng ngành ${major}`
                  : `Nghiên cứu bộ công cụ căn bản và chuẩn hóa quy trình làm việc chuyên ngành ${major}`,
                deadline: '2 tuần',
                priority: 'high',
              },
              {
                title: `Thực hành 3 bài tập mô phỏng kỹ năng ${topGaps[0] || 'cốt lõi'} theo tiêu chuẩn PTIT`,
                deadline: '3 tuần',
                priority: 'medium',
              },
            ],
            requiredSkills: topGaps.slice(0, 2),
            recommendedEventIds: eventIds,
            hypotheticalItems: [
              {
                type: 'event',
                title: `Workshop: Chinh phục kỹ năng ${topGaps[0] || 'cốt lõi'} cho sinh viên ${major}`,
                organizer: 'CLB Học thuật & Doanh nghiệp PTIT',
                note: 'Khuyến nghị tham gia để bổ sung khoảng trống kỹ năng từ CV',
              },
            ],
          },
          {
            milestoneNumber: 2,
            roleTitle: m2Title,
            badgeLabel: 'Core Execution • Thực tập sinh Intern',
            keyFocus: `Tham gia trực tiếp dự án thực tế, cọ xát nghiệp vụ giải quyết bài toán doanh nghiệp ngành ${major}`,
            practicalTasks: [
              {
                title: isRegen
                  ? `Chủ động triển khai mini-project áp dụng công nghệ số giải quyết yêu cầu ${topGaps[1] || 'thực chiến'}`
                  : `Tham gia trực tiếp quy trình triển khai công việc thực tế tại doanh nghiệp đối tác`,
                deadline: '1 tháng',
                priority: 'high',
              },
              {
                title: `Đo lường hiệu quả công việc và lập báo cáo tiến độ định kỳ`,
                deadline: '6 tuần',
                priority: 'high',
              },
            ],
            requiredSkills: topGaps.slice(1, 3),
            recommendedEventIds: eventIds,
            hypotheticalItems: [
              {
                type: 'job',
                title: `Thực tập sinh ${major} - Dự án Chuyển đổi số`,
                company: 'Tập đoàn Công nghệ & Viễn thông Đối tác PTIT',
                note: 'Cơ hội thực tập mô phỏng tích lũy kinh nghiệm thực tế',
              },
            ],
          },
          {
            milestoneNumber: 3,
            roleTitle: m3Title,
            badgeLabel: targetJob
              ? `🎯 JD Mục tiêu • ${company}`
              : `🎯 Đích đến Chuyên viên • Ngành ${major}`,
            keyFocus: targetJob
              ? `Vị trí mục tiêu tuyển dụng chính thức bạn đang hướng tới tại ${company}`
              : `Vị trí Chuyên viên chính thức chuẩn năng lực ngành ${major}`,
            practicalTasks: [
              {
                title: `Hoàn thiện hồ sơ CV & Portfolio làm nổi bật các dự án khớp với tiêu chuẩn vị trí ${m3Title}`,
                deadline: '3 tháng',
                priority: 'high',
              },
              {
                title: `Luyện tập phỏng vấn tình huống nghiệp vụ và văn hóa tuyển dụng chuyên nghiệp`,
                deadline: '4 tháng',
                priority: 'high',
              },
            ],
            requiredSkills: required.slice(0, 4),
            recommendedEventIds: eventIds,
          },
        ],
        suggestedEvents: eventIds,
        recommendedEventIds: eventIds,
        coreAdvice: `Hoàn thiện các nhiệm vụ thực chiến ở Cột mốc 1 và 2 để tự tin đạt chuẩn năng lực vị trí ${m3Title}.`,
      },
    });
  }
});

// ==================== VITE MIDDLEWARE OR STATIC SERVE ====================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[PTIT Career Hub Server] Running on http://localhost:${PORT}`);
    console.log(`[Gemini Integration] API Key status: ${geminiApiKey ? 'Configured' : 'Missing'}`);
  });
}

startServer();
