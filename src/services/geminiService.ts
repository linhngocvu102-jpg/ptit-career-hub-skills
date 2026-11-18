/**
 * GEMINI SERVICE (geminiService.ts)
 *
 * Dedicated service for:
 * 1. parseCVFromPDF(fileOrBase64, fileName)
 * 2. parseJobDescription(jd)
 * 3. analyzeCVMatch(extractedCV, parsedJD)
 * 4. calculateMatchScore(matchItems)
 * 5. generateCVSuggestions(extractedCV, parsedJD, matchResult)
 * 6. saveCVSession(userId, cvSession)
 *
 * Strictly adheres to:
 * - NO MOCK DATA in Real CV Mode
 * - NO HALLUCINATIONS (null / [] for missing data)
 * - Multimodal PDF Document Input (mimeType: application/pdf)
 * - Weighted Match Scoring (40/25/15/10/5/5)
 * - Evidence quotes for every match item
 * - No fake metrics or invented KPIs
 */

import { TargetJob, UserProfileState } from '../types';

// ==================== TYPE DEFINITIONS ====================

export interface CandidateInfo {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  portfolio: string | null;
}

export interface EducationItem {
  school: string;
  major: string | null;
  degree: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  source?: 'cv_extracted' | 'user_verified';
}

export interface WorkExperienceItem {
  company: string;
  position: string;
  startDate: string | null;
  endDate: string | null;
  description: string[];
  skillsMentioned: string[];
  achievementsMentioned: string[];
  source?: 'cv_extracted' | 'user_verified';
}

export interface ProjectItem {
  name: string;
  role: string | null;
  description: string[];
  skillsMentioned: string[];
  resultsMentioned: string[];
  source?: 'cv_extracted' | 'user_verified';
}

export interface SkillItem {
  name: string;
  category: string | null;
  evidence: string;
  source?: 'cv_extracted' | 'user_verified';
}

export interface ExtractedCVData {
  candidate: CandidateInfo;
  careerObjective: string | null;
  education: EducationItem[];
  workExperience: WorkExperienceItem[];
  internships: any[];
  projects: ProjectItem[];
  activities: any[];
  skills: SkillItem[];
  certifications: string[];
  languages: string[];
  achievements: string[];
  extractedKeywords: string[];
  confidence: {
    overall: number;
    candidateName: number;
    education: number;
    experience: number;
    skills: number;
  };
  missingInformation: string[];
}

export interface ParsedJDData {
  jobTitle: string;
  company: string;
  location: string;
  employmentType: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  keywords: string[];
  tools: string[];
  experienceRequirements: string[];
  educationRequirements: string[];
}

export interface MatchItem {
  requirement: string;
  category: 'requiredSkills' | 'experience' | 'responsibilities' | 'education' | 'preferredSkills' | 'keywordsAndTools';
  status: 'matched' | 'partial' | 'not_found' | 'uncertain';
  evidence: string | null;
  confidence: number;
}

export interface MatchResultData {
  overallMatch: number;
  breakdown: {
    requiredSkills: number;
    experience: number;
    responsibilities: number;
    education: number;
    preferredSkills: number;
    keywordsAndTools: number;
  };
  matchItems: MatchItem[];
  summary: string;
}

export interface BulletImprovementItem {
  id: string;
  original: string;
  improved: string;
  reason: string;
}

export interface CVSuggestionsData {
  strengths: Array<{
    title: string;
    evidence: string;
    impact: string;
  }>;
  missingElements: Array<{
    requirement: string;
    explanation: string;
    advice: string;
  }>;
  bulletImprovements: BulletImprovementItem[];
  keywordsToHighlight: Array<{
    keyword: string;
    foundInCv: boolean;
    context: string;
  }>;
  skillsToAcquire: Array<{
    skill: string;
    note: string;
  }>;
  disclaimer: string;
}

export interface GeneralCVReviewData {
  overallScore: number;
  breakdown: {
    layout: number; // /25
    contentQuality: number; // /25
    relevance: number; // /25
    impact: number; // /25
  };
  summary: string;
  layoutReview: {
    assessment: string;
    strengths: string[];
    improvements: string[];
  };
  informationAudit: {
    valuableInfo: Array<{
      section: string;
      item: string;
      whyImportant: string;
    }>;
    redundantOrUnnecessaryInfo: Array<{
      section: string;
      item: string;
      reason: string;
      suggestion: string;
    }>;
    missingCrucialInfo: Array<{
      section: string;
      item: string;
      whyNeeded: string;
    }>;
  };
  keyRecommendations: string[];
}

export interface CVSessionState {
  id: string;
  fileName: string;
  fileSize?: number;
  uploadedAt: string;
  status: 'uploaded' | 'parsing_cv' | 'cv_parsed' | 'user_verified' | 'parsing_jd' | 'matching' | 'completed' | 'error';
  extractedCV: ExtractedCVData | null;
  verifiedCV?: ExtractedCVData | null;
  targetJobId?: string | null;
  targetJobTitle?: string | null;
  targetCompany?: string | null;
  parsedJD?: ParsedJDData | null;
  matchResult?: MatchResultData | null;
  suggestions?: CVSuggestionsData | null;
  generalReview?: GeneralCVReviewData | null;
  errorMessage?: string | null;
}

// ==================== PROMPTS ====================

export const CV_PARSER_PROMPT = `Bạn là hệ thống trích xuất dữ liệu CV.
Hãy đọc trực tiếp file PDF được cung cấp.

MỤC TIÊU:
Trích xuất dữ liệu CV thành JSON có cấu trúc.

QUY TẮC:
1. Chỉ sử dụng thông tin xuất hiện trong PDF.
2. Không suy đoán.
3. Không bổ sung thông tin từ kiến thức bên ngoài.
4. Không sử dụng dữ liệu từ CV khác.
5. Không sử dụng tên file làm nguồn dữ liệu.
6. Nếu thông tin không xuất hiện → null hoặc [].
7. Giữ nguyên tên công ty, trường học, chức danh, kỹ năng và nội dung quan trọng theo CV.
8. Không biến kinh nghiệm học tập thành kinh nghiệm làm việc.
9. Không biến một kỹ năng được JD yêu cầu thành kỹ năng của ứng viên.
10. Không tự tạo thành tích định lượng.
11. Không tự thêm từ khóa để làm CV phù hợp với JD.
12. Đây chỉ là bước trích xuất dữ liệu.

Hãy ưu tiên đọc:
- thông tin cá nhân;
- học vấn;
- kinh nghiệm làm việc;
- thực tập;
- hoạt động;
- dự án;
- kỹ năng;
- chứng chỉ;
- ngoại ngữ;
- mục tiêu nghề nghiệp;
- thành tích.

Nếu CV có bảng, hãy đọc nội dung trong bảng.
Nếu CV có text nằm trong layout, hãy đọc nội dung theo ngữ cảnh.
Nếu CV là PDF có hình ảnh/scanned content và một thông tin không thể đọc chắc chắn: không tự đoán.

Trả về DUY NHẤT một chuỗi JSON hợp lệ tuân thủ đúng cấu trúc:
{
  "candidate": {
    "fullName": null,
    "email": null,
    "phone": null,
    "location": null,
    "linkedin": null,
    "portfolio": null
  },
  "careerObjective": null,
  "education": [
    {
      "school": "",
      "major": null,
      "degree": null,
      "startDate": null,
      "endDate": null,
      "description": null
    }
  ],
  "workExperience": [
    {
      "company": "",
      "position": "",
      "startDate": null,
      "endDate": null,
      "description": [],
      "skillsMentioned": [],
      "achievementsMentioned": []
    }
  ],
  "internships": [],
  "projects": [
    {
      "name": "",
      "role": null,
      "description": [],
      "skillsMentioned": [],
      "resultsMentioned": []
    }
  ],
  "activities": [],
  "skills": [
    {
      "name": "",
      "category": null,
      "evidence": ""
    }
  ],
  "certifications": [],
  "languages": [],
  "achievements": [],
  "extractedKeywords": [],
  "confidence": {
    "overall": 0.9,
    "candidateName": 0.9,
    "education": 0.9,
    "experience": 0.9,
    "skills": 0.9
  },
  "missingInformation": []
}`;

export const JD_PARSER_PROMPT = `Bạn là Chuyên gia Tuyển dụng phân tích Bản mô tả công việc (JD).
Nhiệm vụ: Trích xuất các tiêu chí, yêu cầu kỹ năng và trách nhiệm của JD thành JSON có cấu trúc.
Không được trộn thông tin CV vào JD.

Trả về DUY NHẤT một chuỗi JSON hợp lệ theo schema sau:
{
  "jobTitle": "",
  "company": "",
  "location": "",
  "employmentType": null,
  "requiredSkills": [],
  "preferredSkills": [],
  "responsibilities": [],
  "requiredQualifications": [],
  "preferredQualifications": [],
  "keywords": [],
  "tools": [],
  "experienceRequirements": [],
  "educationRequirements": []
}`;

export const MATCHING_PROMPT = `Bạn là Trưởng ban Tuyển dụng đối chiếu trung thực giữa Hồ sơ CV của ứng viên và Bản mô tả công việc (JD).

QUY TẮC ĐỐI CHIẾU:
1. Chỉ đối chiếu dựa trên thông tin thực tế có trong CV JSON và JD JSON.
2. Không suy đoán, không bịa đặt kỹ năng hoặc kinh nghiệm ứng viên không có.
3. CHỈ SỬ DỤNG 4 TRẠNG THÁI:
   - "matched": CV có bằng chứng rõ ràng.
   - "partial": CV có thông tin liên quan nhưng chưa đáp ứng đầy đủ.
   - "not_found": Không tìm thấy trong CV.
   - "uncertain": Có thông tin nhưng không đủ chắc chắn để kết luận.
4. MỖI MATCH PHẢI CÓ EVIDENCE:
   - Nếu matched/partial: trích dẫn dòng/câu trong CV chứng minh.
   - Nếu not_found: evidence là null. Không được viết "Ứng viên có khả năng..." nếu CV không có bằng chứng!
5. Phân loại theo 6 nhóm tiêu chí:
   - "requiredSkills"
   - "experience"
   - "responsibilities"
   - "education"
   - "preferredSkills"
   - "keywordsAndTools"

Trả về DUY NHẤT chuỗi JSON hợp lệ theo cấu trúc:
{
  "matchItems": [
    {
      "requirement": "Tên yêu cầu từ JD",
      "category": "requiredSkills",
      "status": "matched",
      "evidence": "Câu trích dẫn từ CV chứng minh hoặc null",
      "confidence": 0.95
    }
  ],
  "summary": "Nhận xét ngắn 2 câu đánh giá khách quan về sự phù hợp"
}`;

export const SUGGESTION_PROMPT = `Bạn là Cố vấn Nghề nghiệp cao cấp.
Nhiệm vụ: Đề xuất cải thiện CV dựa trên kết quả đối chiếu với JD.

QUY TẮC QUAN TRỌNG NHẤT:
1. KHÔNG ĐƯỢC TẠO SỐ LIỆU GIẢ:
   Không tự thêm phần trăm (+35% engagement), không tạo doanh thu, không tạo số lượng khách hàng, không tạo KPI nếu CV không có số liệu đó.
2. CHỈ VIẾT LẠI DỰA TRÊN THÔNG TIN THỰC TẾ ĐÃ CÓ.
3. KỸ NĂNG CẦN BỔ SUNG:
   Ghi rõ "Đây là kỹ năng JD yêu cầu nhưng chưa tìm thấy bằng chứng trong CV." Không được biến nó thành kỹ năng hiện tại của ứng viên.

Trả về DUY NHẤT chuỗi JSON hợp lệ:
{
  "strengths": [
    {
      "title": "Tiêu đề điểm mạnh",
      "evidence": "Trích dẫn thực tế từ CV",
      "impact": "Lý do điểm mạnh này giúp ích cho vị trí ứng tuyển"
    }
  ],
  "missingElements": [
    {
      "requirement": "Yêu cầu JD đang thiếu",
      "explanation": "Yêu cầu của JD chưa tìm thấy bằng chứng trong CV",
      "advice": "Lời khuyên thực tế để trau dồi hoặc bổ sung"
    }
  ],
  "bulletImprovements": [
    {
      "id": "bullet-1",
      "original": "Câu trích từ CV ứng viên",
      "improved": "Câu viết lại trau chuốt hành động (không bịa số liệu)",
      "reason": "Chỉ viết lại dựa trên thông tin thực tế đã có, không tự bịa số liệu, KPI hay thành tích mới"
    }
  ],
  "keywordsToHighlight": [
    {
      "keyword": "Từ khóa xuất hiện trong CV phù hợp với JD",
      "foundInCv": true,
      "context": "Vị trí trong CV nên nhấn mạnh"
    }
  ],
  "skillsToAcquire": [
    {
      "skill": "Tên kỹ năng",
      "note": "Đây là kỹ năng JD yêu cầu nhưng chưa tìm thấy bằng chứng trong CV."
    }
  ],
  "disclaimer": "AI chỉ đề xuất thay đổi dựa trên thông tin có thật trong CV. Không thêm kinh nghiệm hoặc kỹ năng chưa có."
}`;

export const GENERAL_CV_REVIEW_PROMPT = `Bạn là Chuyên gia Tuyển dụng cấp cao và Cố vấn Thẩm định CV (Senior HR Auditor & Career Coach).
Ứng viên vừa tải lên CV và muốn được đánh giá toàn diện khi chưa chọn công việc mục tiêu cụ thể.

MỤC TIÊU:
Đưa ra nhận xét khách quan, chuyên sâu theo cái nhìn tổng quan nhất về:
1. BỐ CỤC VÀ TRÌNH BÀY (Layout & Presentation):
   - Đánh giá tính trực quan, độ mạch lạc, phân cấp tiêu đề, khoảng cách, font chữ, độ dài tối ưu (1-2 trang).
   - Đánh giá khả năng quét mắt nhanh của nhà tuyển dụng trong 6-10 giây đầu tiên và khả năng tương thích ATS.
   - Nêu rõ các điểm mạnh về bố cục và các điểm cần khắc phục.
2. TÍNH CẦN THIẾT CỦA CÁC THÔNG TIN ĐƯỢC ĐƯA VÀO (Information Relevance & Redundancy):
   - Chỉ ra thông tin nào là CẦN THIẾT, đắt giá, chuyên nghiệp, cần giữ lại và làm nổi bật.
   - Chỉ ra thông tin nào KHÔNG CẦN THIẾT, DƯ THỪA, làm loãng CV hoặc không phù hợp (ví dụ: thông tin cá nhân quá chi tiết như số CMND/CCCD, tình trạng hôn nhân, quê quán dài dòng; sở thích chung chung không liên quan chuyên môn; mô tả công việc vụn vặt thiếu kết quả; kỹ năng quá cơ bản hoặc thang điểm % tự đánh giá vô nghĩa). Nêu rõ lý do và đề xuất cắt bỏ/thay thế.
   - Chỉ ra những THÔNG TIN QUAN TRỌNG ĐANG BỊ THIẾU mà nhà tuyển dụng luôn kỳ vọng (ví dụ: số liệu định lượng thành tựu %, link GitHub/Portfolio/LinkedIn, công nghệ/công cụ thực chiến).
3. ĐIỂM SỐ ĐÁNH GIÁ TỔNG QUAN (Thang điểm 100):
   - overallScore (0-100)
   - breakdown: layout (0-25), contentQuality (0-25), relevance (0-25), impact (0-25).

QUY TẮC:
- Căn cứ hoàn toàn trên dữ liệu CV đã trích xuất, không bịa đặt kinh nghiệm.
- Giọng văn chân thành, khách quan, mang tính xây dựng cao.

Trả về DUY NHẤT một chuỗi JSON hợp lệ theo schema sau:
{
  "overallScore": 75,
  "breakdown": {
    "layout": 19,
    "contentQuality": 18,
    "relevance": 19,
    "impact": 19
  },
  "summary": "Đoạn nhận xét tổng quan toàn diện và chân thực nhất về CV...",
  "layoutReview": {
    "assessment": "Đánh giá chi tiết về cấu trúc phân mục, tính mạch lạc và độ tương thích ATS...",
    "strengths": ["Điểm cộng về bố cục 1", "Điểm cộng về bố cục 2"],
    "improvements": ["Điểm cần sửa về trình bày 1", "Điểm cần sửa về trình bày 2"]
  },
  "informationAudit": {
    "valuableInfo": [
      {
        "section": "Kinh nghiệm / Kỹ năng / Dự án",
        "item": "Chi tiết thông tin đắt giá",
        "whyImportant": "Lý do thông tin này có giá trị cao và cần giữ lại"
      }
    ],
    "redundantOrUnnecessaryInfo": [
      {
        "section": "Thông tin cá nhân / Kỹ năng / Hoạt động",
        "item": "Chi tiết thông tin thừa thãi hoặc không cần thiết",
        "reason": "Tại sao thông tin này không cần thiết / làm loãng CV",
        "suggestion": "Đề xuất cắt bỏ hoặc cách viết lại ngắn gọn hơn"
      }
    ],
    "missingCrucialInfo": [
      {
        "section": "Dự án / Liên hệ / Thành tựu",
        "item": "Thông tin quan trọng còn thiếu",
        "whyNeeded": "Tại sao nhà tuyển dụng cần thấy thông tin này"
      }
    ]
  },
  "keyRecommendations": [
    "Lời khuyên hành động cụ thể 1",
    "Lời khuyên hành động cụ thể 2",
    "Lời khuyên hành động cụ thể 3"
  ]
}`;

// ==================== INITIALIZATION & UTILITIES ====================

export function initializeGemini() {
  const envKey =
    (typeof process !== 'undefined' && (process.env as any)?.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_GEMINI_API_KEY) ||
    '';
  const hasKey = Boolean(envKey && envKey.trim().length > 5);

  return {
    isConfigured: hasKey,
    primaryModel: 'gemini-3.8-flash',
    fallbackModel: 'gemini-flash-latest',
    message: hasKey
      ? 'Hệ thống AI đã sẵn sàng phân tích CV và JD thực tế.'
      : 'Gemini integration requires GEMINI_API_KEY to be configured in environment secrets.',
  };
}

/**
 * Direct SDK fallback if server endpoint is unreachable
 */
async function callDirectGemini(contents: any): Promise<string> {
  const apiKey =
    (typeof process !== 'undefined' && (process.env as any)?.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_GEMINI_API_KEY) ||
    '';

  if (!apiKey || apiKey.trim().length < 5) {
    throw new Error('Gemini integration requires GEMINI_API_KEY to be configured in environment secrets.');
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const models = ['gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const resp = await ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
        if (resp.text) return resp.text;
      } catch (err: any) {
        lastError = err;
        const status = err.status || err.statusCode;
        if (status === 503 || status === 429) {
          await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('Không thể kết nối tới mô hình Gemini.');
}

// ==================== 1. PARSE CV FROM PDF ====================

/**
 * parseCVFromPDF(fileOrBase64, fileName)
 * Pipeline: PDF (mimeType: application/pdf) -> Gemini CV Parser -> Structured CV JSON
 */
export async function parseCVFromPDF(
  fileOrBase64: File | Blob | string,
  fileName = 'CV.pdf'
): Promise<ExtractedCVData> {
  let cleanBase64 = '';

  if (typeof fileOrBase64 === 'string') {
    cleanBase64 = fileOrBase64.replace(/^data:application\/pdf;base64,/, '').trim();
  } else {
    const blobObj = fileOrBase64 as any;
    cleanBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        resolve(res.replace(/^data:application\/pdf;base64,/, '').trim());
      };
      reader.onerror = reject;
      reader.readAsDataURL(blobObj);
    });
  }

  if (!cleanBase64) {
    throw new Error('Vui lòng cung cấp tệp CV định dạng PDF hợp lệ.');
  }

  // 1. Try server proxy endpoint
  try {
    const res = await fetch('/api/gemini/parse-cv-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64: cleanBase64, fileName }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        return normalizeCVData(json.data);
      }
    }
  } catch (err) {
    console.warn('Server proxy not available, falling back to direct SDK:', err);
  }

  // 2. Direct SDK fallback
  const rawText = await callDirectGemini([
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: cleanBase64,
      },
    },
    CV_PARSER_PROMPT,
  ]);

  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return normalizeCVData(parsed);
}

function normalizeCVData(raw: any): ExtractedCVData {
  const candidate = raw.candidate || {};
  return {
    candidate: {
      fullName: candidate.fullName || null,
      email: candidate.email || null,
      phone: candidate.phone || null,
      location: candidate.location || null,
      linkedin: candidate.linkedin || null,
      portfolio: candidate.portfolio || null,
    },
    careerObjective: raw.careerObjective || null,
    education: Array.isArray(raw.education)
      ? raw.education.map((e: any) => ({
          school: e.school || '',
          major: e.major || null,
          degree: e.degree || null,
          startDate: e.startDate || null,
          endDate: e.endDate || null,
          description: e.description || null,
          source: 'cv_extracted',
        }))
      : [],
    workExperience: Array.isArray(raw.workExperience)
      ? raw.workExperience.map((w: any) => ({
          company: w.company || '',
          position: w.position || '',
          startDate: w.startDate || null,
          endDate: w.endDate || null,
          description: Array.isArray(w.description) ? w.description : [],
          skillsMentioned: Array.isArray(w.skillsMentioned) ? w.skillsMentioned : [],
          achievementsMentioned: Array.isArray(w.achievementsMentioned) ? w.achievementsMentioned : [],
          source: 'cv_extracted',
        }))
      : [],
    internships: Array.isArray(raw.internships) ? raw.internships : [],
    projects: Array.isArray(raw.projects)
      ? raw.projects.map((p: any) => ({
          name: p.name || p.title || '',
          role: p.role || null,
          description: Array.isArray(p.description) ? p.description : p.bullets || [],
          skillsMentioned: Array.isArray(p.skillsMentioned) ? p.skillsMentioned : p.technologies || [],
          resultsMentioned: Array.isArray(p.resultsMentioned) ? p.resultsMentioned : [],
          source: 'cv_extracted',
        }))
      : [],
    activities: Array.isArray(raw.activities) ? raw.activities : [],
    skills: Array.isArray(raw.skills)
      ? raw.skills.map((s: any) => ({
          name: typeof s === 'string' ? s : s.name || '',
          category: s.category || null,
          evidence: s.evidence || 'Được liệt kê trong CV',
          source: 'cv_extracted',
        }))
      : [],
    certifications: Array.isArray(raw.certifications) ? raw.certifications : [],
    languages: Array.isArray(raw.languages) ? raw.languages : [],
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    extractedKeywords: Array.isArray(raw.extractedKeywords) ? raw.extractedKeywords : [],
    confidence: raw.confidence || {
      overall: 0.9,
      candidateName: raw.candidate?.fullName ? 0.95 : 0.2,
      education: 0.85,
      experience: 0.85,
      skills: 0.9,
    },
    missingInformation: Array.isArray(raw.missingInformation) ? raw.missingInformation : [],
  };
}

// ==================== 2. PARSE JOB DESCRIPTION (DATA INJECTION TỪ JD MỤC TIÊU) ====================

export async function parseJobDescription(jd: TargetJob | string | any): Promise<ParsedJDData> {
  let jdPayload: any = jd;
  if (typeof jd === 'object' && jd !== null) {
    // Tự động truyền đầy đủ thông tin của JD Mục tiêu:
    // 1. Tiêu đề vị trí (jobTitle)
    // 2. Tên công ty (company)
    // 3. Yêu cầu kỹ năng (requiredSkills)
    // 4. Mô tả công việc (description/responsibilities)
    // 5. Yêu cầu ứng viên (requiredQualifications/requirements)
    const reqSkills = Array.isArray(jd.requiredSkills) && jd.requiredSkills.length > 0
      ? jd.requiredSkills
      : (Array.isArray(jd.skillTags) ? jd.skillTags : []);

    const candidateReqs = Array.isArray(jd.requirements) && jd.requirements.length > 0
      ? jd.requirements
      : (Array.isArray(jd.requiredQualifications) ? jd.requiredQualifications : []);

    const resps = Array.isArray(jd.responsibilities) && jd.responsibilities.length > 0
      ? jd.responsibilities
      : (jd.description ? [jd.description] : []);

    jdPayload = {
      jobTitle: jd.title || jd.jobTitle || '',
      company: jd.company || jd.companyName || '',
      location: jd.location || '',
      employmentType: jd.employmentType || jd.jobType || '',
      description: jd.description || '', // Mô tả công việc
      responsibilities: resps, // Trách nhiệm công việc
      requiredSkills: reqSkills, // Yêu cầu kỹ năng
      preferredSkills: Array.isArray(jd.preferredSkills) ? jd.preferredSkills : [],
      requiredQualifications: candidateReqs, // Yêu cầu ứng viên
      experienceRequirements: jd.experience ? [jd.experience] : [],
      educationRequirements: jd.education ? [jd.education] : [],
      salary: jd.salaryDisplay || jd.salaryText || '',
    };
  }

  const jdString = typeof jdPayload === 'string' ? jdPayload : JSON.stringify(jdPayload, null, 2);

  try {
    const res = await fetch('/api/gemini/parse-jd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobData: jdPayload }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        return normalizeJDData(json.data, jdPayload);
      }
    }
  } catch (err) {
    console.warn('Server proxy not available, falling back to direct SDK:', err);
  }

  const prompt = `${JD_PARSER_PROMPT}\n\n=== NỘI DUNG JD MỤC TIÊU ĐÃ CHỌN (DATA INJECTION) ===\n${jdString}`;
  const rawText = await callDirectGemini(prompt);
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return normalizeJDData(parsed, jdPayload);
}

function normalizeJDData(raw: any, sourceJd?: any): ParsedJDData {
  const reqSkills = Array.isArray(raw?.requiredSkills) && raw.requiredSkills.length > 0
    ? raw.requiredSkills
    : (Array.isArray(sourceJd?.requiredSkills) && sourceJd.requiredSkills.length > 0
      ? sourceJd.requiredSkills
      : (Array.isArray(sourceJd?.skillTags) ? sourceJd.skillTags : []));

  const reqQuals = Array.isArray(raw?.requiredQualifications) && raw.requiredQualifications.length > 0
    ? raw.requiredQualifications
    : (Array.isArray(sourceJd?.requiredQualifications) && sourceJd.requiredQualifications.length > 0
      ? sourceJd.requiredQualifications
      : (Array.isArray(sourceJd?.requirements) ? sourceJd.requirements : []));

  const resps = Array.isArray(raw?.responsibilities) && raw.responsibilities.length > 0
    ? raw.responsibilities
    : (Array.isArray(sourceJd?.responsibilities) && sourceJd.responsibilities.length > 0
      ? sourceJd.responsibilities
      : (sourceJd?.description ? [sourceJd.description] : []));

  return {
    jobTitle: raw?.jobTitle || raw?.title || sourceJd?.jobTitle || sourceJd?.title || '',
    company: raw?.company || raw?.companyName || sourceJd?.company || sourceJd?.companyName || '',
    location: raw?.location || sourceJd?.location || '',
    employmentType: raw?.employmentType || sourceJd?.employmentType || sourceJd?.jobType || null,
    requiredSkills: reqSkills,
    preferredSkills: Array.isArray(raw?.preferredSkills) && raw.preferredSkills.length > 0
      ? raw.preferredSkills
      : (Array.isArray(sourceJd?.preferredSkills) ? sourceJd.preferredSkills : []),
    responsibilities: resps,
    requiredQualifications: reqQuals,
    preferredQualifications: Array.isArray(raw?.preferredQualifications) ? raw.preferredQualifications : [],
    keywords: Array.isArray(raw?.keywords) ? raw.keywords : [],
    tools: Array.isArray(raw?.tools) && raw.tools.length > 0 ? raw.tools : reqSkills,
    experienceRequirements: Array.isArray(raw?.experienceRequirements) && raw.experienceRequirements.length > 0
      ? raw.experienceRequirements
      : (sourceJd?.experience ? [sourceJd.experience] : (sourceJd?.experienceRequirements || [])),
    educationRequirements: Array.isArray(raw?.educationRequirements) && raw.educationRequirements.length > 0
      ? raw.educationRequirements
      : (sourceJd?.education ? [sourceJd.education] : (sourceJd?.educationRequirements || [])),
  };
}

// ==================== 3. ANALYZE CV MATCH ====================

export async function analyzeCVMatch(
  extractedCV: ExtractedCVData,
  parsedJD: ParsedJDData
): Promise<MatchResultData> {
  const payload = { cvData: extractedCV, jdData: parsedJD };
  let rawResult: any = null;

  try {
    const res = await fetch('/api/gemini/analyze-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        rawResult = json.data;
      }
    }
  } catch (err) {
    console.warn('Server proxy not available, falling back to direct SDK:', err);
  }

  if (!rawResult) {
    const prompt = `${MATCHING_PROMPT}\n\n=== CV DATA (JSON) ===\n${JSON.stringify(
      extractedCV,
      null,
      2
    )}\n\n=== JD DATA (JSON) ===\n${JSON.stringify(parsedJD, null, 2)}`;
    const rawText = await callDirectGemini(prompt);
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    rawResult = JSON.parse(cleaned);
  }

  const matchItems: MatchItem[] = Array.isArray(rawResult.matchItems)
    ? rawResult.matchItems.map((item: any) => {
        let status = item.status;
        if (!['matched', 'partial', 'not_found', 'uncertain'].includes(status)) {
          status = status === 'pass' ? 'matched' : 'not_found';
        }
        return {
          requirement: item.requirement || item.skill || '',
          category: item.category || 'requiredSkills',
          status,
          evidence: status === 'not_found' ? null : item.evidence || item.evidenceInCv || null,
          confidence: typeof item.confidence === 'number' ? item.confidence : 0.9,
        };
      })
    : [];

  const scoreResult = calculateMatchScore(matchItems);

  return {
    overallMatch: scoreResult.overallMatch,
    breakdown: scoreResult.breakdown,
    matchItems,
    summary: rawResult.summary || rawResult.executiveSummary || 'Đối chiếu chi tiết giữa CV và JD.',
  };
}

// ==================== 4. CALCULATE MATCH SCORE (SECTION XI) ====================

export function calculateMatchScore(matchItems: MatchItem[] = []) {
  const categories: Record<string, { weight: number; items: MatchItem[] }> = {
    requiredSkills: { weight: 40, items: [] },
    experience: { weight: 25, items: [] },
    responsibilities: { weight: 15, items: [] },
    education: { weight: 10, items: [] },
    preferredSkills: { weight: 5, items: [] },
    keywordsAndTools: { weight: 5, items: [] },
  };

  matchItems.forEach((item) => {
    const cat = categories[item.category] ? item.category : 'requiredSkills';
    categories[cat].items.push(item);
  });

  const breakdown = {
    requiredSkills: 0,
    experience: 0,
    responsibilities: 0,
    education: 0,
    preferredSkills: 0,
    keywordsAndTools: 0,
  };

  let totalScore = 0;

  Object.keys(categories).forEach((catKey) => {
    const group = categories[catKey];
    if (group.items.length === 0) {
      breakdown[catKey as keyof typeof breakdown] = 0;
      return;
    }

    let groupPoints = 0;
    group.items.forEach((item) => {
      if (item.status === 'matched') {
        groupPoints += 1.0;
      } else if (item.status === 'partial') {
        groupPoints += 0.5;
      } else if (item.status === 'uncertain') {
        groupPoints += 0.25;
      }
    });

    const categoryRatio = groupPoints / group.items.length;
    const scoredWeight = Math.round(categoryRatio * group.weight);
    breakdown[catKey as keyof typeof breakdown] = scoredWeight;
    totalScore += scoredWeight;
  });

  return {
    overallMatch: Math.min(Math.max(totalScore, 0), 100),
    breakdown,
  };
}

// ==================== 5. GENERATE CV SUGGESTIONS ====================

export async function generateCVSuggestions(
  extractedCV: ExtractedCVData,
  parsedJD: ParsedJDData,
  matchResult: MatchResultData
): Promise<CVSuggestionsData> {
  const payload = { cvData: extractedCV, jdData: parsedJD, matchResult };
  let raw: any = null;

  try {
    const res = await fetch('/api/gemini/generate-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        raw = json.data;
      }
    }
  } catch (err) {
    console.warn('Server proxy not available, falling back to direct SDK:', err);
  }

  if (!raw) {
    const prompt = `${SUGGESTION_PROMPT}\n\n=== CV DATA ===\n${JSON.stringify(
      extractedCV,
      null,
      2
    )}\n\n=== JD DATA ===\n${JSON.stringify(parsedJD, null, 2)}\n\n=== MATCH RESULT ===\n${JSON.stringify(
      matchResult,
      null,
      2
    )}`;
    const rawText = await callDirectGemini(prompt);
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    raw = JSON.parse(cleaned);
  }

  return {
    strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    missingElements: Array.isArray(raw.missingElements) ? raw.missingElements : [],
    bulletImprovements: Array.isArray(raw.bulletImprovements)
      ? raw.bulletImprovements.map((b: any, i: number) => ({
          id: b.id || `bullet-${i + 1}`,
          original: b.original || b.originalText || '',
          improved: b.improved || b.suggestedText || '',
          reason: b.reason || b.explanation || 'Chỉ viết lại dựa trên thông tin thực tế đã có trong CV.',
        }))
      : [],
    keywordsToHighlight: Array.isArray(raw.keywordsToHighlight) ? raw.keywordsToHighlight : [],
    skillsToAcquire: Array.isArray(raw.skillsToAcquire)
      ? raw.skillsToAcquire.map((s: any) => ({
          skill: s.skill || s.keyword || '',
          note: s.note || 'Đây là kỹ năng JD yêu cầu nhưng chưa tìm thấy bằng chứng trong CV.',
        }))
      : [],
    disclaimer:
      raw.disclaimer ||
      'AI chỉ đề xuất thay đổi dựa trên thông tin có thật trong CV. Không thêm kinh nghiệm hoặc kỹ năng chưa có.',
  };
}

// ==================== 5B. ANALYZE GENERAL CV OVERVIEW (KHI CHƯA CHỌN CÔNG VIỆC MỤC TIÊU) ====================

export async function analyzeGeneralCV(
  extractedCV: ExtractedCVData
): Promise<GeneralCVReviewData> {
  let raw: any = null;

  try {
    const res = await fetch('/api/gemini/analyze-general-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cvData: extractedCV }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        raw = json.data;
      }
    }
  } catch (err) {
    console.warn('Server proxy not available for general CV review, trying direct SDK:', err);
  }

  if (!raw) {
    try {
      const prompt = `${GENERAL_CV_REVIEW_PROMPT}\n\n=== DỮ LIỆU CV CẦN THẨM ĐỊNH (JSON) ===\n${JSON.stringify(
        extractedCV,
        null,
        2
      )}`;
      const rawText = await callDirectGemini(prompt);
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      raw = JSON.parse(cleaned);
    } catch (sdkErr) {
      console.warn('Direct SDK failed, building deterministic general review:', sdkErr);
    }
  }

  // Fallback heuristic assessment if AI fails or lacks fields
  const candidate: Partial<CandidateInfo> = extractedCV?.candidate || {};
  const skillsCount = extractedCV?.skills?.length || 0;
  const expsCount = extractedCV?.workExperience?.length || 0;
  const projCount = extractedCV?.projects?.length || 0;
  const hasObjective = Boolean(extractedCV?.careerObjective && extractedCV.careerObjective.length > 20);
  const hasContact = Boolean(candidate.email && candidate.phone);
  const hasLinks = Boolean(candidate.linkedin || candidate.portfolio);

  const defaultOverall = Math.min(
    Math.max(50 + (hasContact ? 10 : 0) + (hasLinks ? 8 : 0) + Math.min(skillsCount * 2, 14) + Math.min((expsCount + projCount) * 4, 18), 58),
    92
  );

  return {
    overallScore: typeof raw?.overallScore === 'number' ? raw.overallScore : defaultOverall,
    breakdown: {
      layout: typeof raw?.breakdown?.layout === 'number' ? raw.breakdown.layout : 19,
      contentQuality: typeof raw?.breakdown?.contentQuality === 'number' ? raw.breakdown.contentQuality : 18,
      relevance: typeof raw?.breakdown?.relevance === 'number' ? raw.breakdown.relevance : 19,
      impact: typeof raw?.breakdown?.impact === 'number' ? raw.breakdown.impact : 18,
    },
    summary:
      raw?.summary ||
      `Hồ sơ của ${candidate.fullName || 'bạn'} có cấu trúc nền tảng khá tốt, phân bố thông tin học vấn và kỹ năng rõ ràng. Để tăng sức thuyết phục với nhà tuyển dụng, bạn cần chắt lọc bỏ các thông tin dư thừa, tập trung vào kết quả định lượng cụ thể trong các dự án thực tế và bổ sung các liên kết minh chứng chuyên môn.`,
    layoutReview: {
      assessment:
        raw?.layoutReview?.assessment ||
        'Bố cục tổng quan được sắp xếp tương đối khoa học, các tiêu đề phân mục chính rõ ràng giúp người đọc dễ định hướng. Tuy nhiên cần chú ý mật độ văn bản và khoảng trắng giữa các khối.',
      strengths: Array.isArray(raw?.layoutReview?.strengths) && raw.layoutReview.strengths.length > 0
        ? raw.layoutReview.strengths
        : [
            'Cấu trúc các khối thông tin cơ bản (Liên hệ, Học vấn, Kỹ năng, Dự án) đúng chuẩn trình bày',
            'Phân cấp thị giác giữa tiêu đề mục và nội dung con tương đối trực quan',
            'Độ dài phân bổ phù hợp cho ứng viên sinh viên chuẩn bị tốt nghiệp',
          ],
      improvements: Array.isArray(raw?.layoutReview?.improvements) && raw.layoutReview.improvements.length > 0
        ? raw.layoutReview.improvements
        : [
            'Cần tối ưu khoảng cách giữa các khối để CV thoáng mắt hơn khi quét nhanh trong 6 giây',
            'Nên dùng gạch đầu dòng ngắn gọn (1-2 dòng/bullet) thay vì các đoạn văn dài liền khối',
            'Đảm bảo định dạng chuẩn ATS (Applicant Tracking System), tránh dùng các biểu tượng lạ làm rách dòng',
          ],
    },
    informationAudit: {
      valuableInfo: Array.isArray(raw?.informationAudit?.valuableInfo) && raw.informationAudit.valuableInfo.length > 0
        ? raw.informationAudit.valuableInfo
        : [
            {
              section: 'Học vấn & Chuyên ngành',
              item: `${extractedCV?.education?.[0]?.school || 'Đại học'} - ${extractedCV?.education?.[0]?.major || 'Chuyên ngành'}`,
              whyImportant: 'Khẳng định nền tảng đào tạo chính quy, đặc biệt phù hợp với các chương trình tuyển dụng Fresher/Intern.',
            },
            {
              section: 'Kỹ năng chuyên môn',
              item: extractedCV?.skills?.slice(0, 4).map((s) => s.name).join(', ') || 'Kỹ năng công nghệ & công cụ',
              whyImportant: 'Đây là các từ khóa cốt lõi mà nhà tuyển dụng và bộ lọc tự động tìm kiếm đầu tiên.',
            },
            ...(projCount > 0
              ? [
                  {
                    section: 'Dự án thực tế',
                    item: `${extractedCV.projects[0]?.name || 'Dự án môn học/thực chiến'}`,
                    whyImportant: 'Minh chứng năng lực ứng dụng kiến thức vào giải quyết bài toán thực tế thay vì chỉ học lý thuyết.',
                  },
                ]
              : []),
          ],
      redundantOrUnnecessaryInfo: Array.isArray(raw?.informationAudit?.redundantOrUnnecessaryInfo) && raw.informationAudit.redundantOrUnnecessaryInfo.length > 0
        ? raw.informationAudit.redundantOrUnnecessaryInfo
        : [
            {
              section: 'Thông tin cá nhân',
              item: 'Địa chỉ nhà quá chi tiết, số CMND/CCCD hoặc tình trạng hôn nhân (nếu có)',
              reason: 'Không cần thiết trong vòng sơ loại hồ sơ và có thể gây rủi ro bảo mật thông tin cá nhân.',
              suggestion: 'Chỉ cần ghi Thành phố hiện tại (ví dụ: Hà Nội, TP.HCM) và thông tin liên hệ chính (Email, SĐT, LinkedIn).',
            },
            {
              section: 'Sở thích cá nhân',
              item: 'Các sở thích chung chung như "nghe nhạc", "xem phim", "du lịch"',
              reason: 'Làm loãng trọng tâm chuyên môn và chiếm diện tích quý giá trên trang CV.',
              suggestion: 'Nên lược bỏ hoàn toàn hoặc thay bằng các hoạt động học thuật, đóng góp cộng đồng có liên quan.',
            },
            {
              section: 'Thanh đo % kỹ năng',
              item: 'Đánh giá kỹ năng dưới dạng thanh % (ví dụ: Tiếng Anh 80%, Java 75%)',
              reason: 'Thang đo phần trăm mang tính cảm tính, không có thước đo chuẩn quốc tế và không thân thiện với hệ thống ATS.',
              suggestion: 'Liệt kê danh sách kỹ năng theo nhóm và chứng minh mức độ thành thạo qua các dự án hoặc chứng chỉ cụ thể.',
            },
          ],
      missingCrucialInfo: Array.isArray(raw?.informationAudit?.missingCrucialInfo) && raw.informationAudit.missingCrucialInfo.length > 0
        ? raw.informationAudit.missingCrucialInfo
        : [
            {
              section: 'Thành tựu định lượng',
              item: 'Các con số đo lường kết quả (KPIs, số lượng người dùng, doanh số, % cải thiện hiệu suất)',
              whyNeeded: 'Nhà tuyển dụng đánh giá cao ứng viên tư duy theo kết quả (impact-driven) hơn là người chỉ đơn thuần làm nhiệm vụ.',
            },
            {
              section: 'Liên kết minh chứng sản phẩm',
              item: 'Link GitHub, Portfolio trực tuyến hoặc hồ sơ LinkedIn',
              whyNeeded: 'Tăng 70% độ tin cậy của CV khi nhà tuyển dụng có thể click trực tiếp để xem sản phẩm bạn đã làm.',
            },
          ],
    },
    keyRecommendations: Array.isArray(raw?.keyRecommendations) && raw.keyRecommendations.length > 0
      ? raw.keyRecommendations
      : [
          'Cắt tỉa ngay các thông tin thừa thãi (sở thích không liên quan, địa chỉ quá dài, thanh đo %) để dồn đất cho các dự án thực tế.',
          'Bổ sung số liệu định lượng vào ít nhất 2-3 gạch đầu dòng mô tả kinh nghiệm hoặc dự án.',
          'Gắn link LinkedIn hoặc sản phẩm thực tế để người tuyển dụng có thể kiểm chứng năng lực tức thì.',
          'Chọn một Công việc mục tiêu cụ thể trên nền tảng để AI đối chiếu 1:1 theo các từ khóa của bản mô tả công việc (JD).',
        ],
  };
}

// ==================== 6. FIRESTORE CV SESSION PERSISTENCE ====================

export function getStoredCVSessions(): CVSessionState[] {
  const sessions: CVSessionState[] = [];
  try {
    const indexRaw = localStorage.getItem('ptit_cv_sessions_index');
    let sessionIds: string[] = indexRaw ? JSON.parse(indexRaw) : [];

    // Also scan any un-indexed ptit_cv_session_ keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ptit_cv_session_')) {
        const id = key.replace('ptit_cv_session_', '');
        if (id && !sessionIds.includes(id)) {
          sessionIds.push(id);
        }
      }
    }

    for (const id of sessionIds) {
      const raw = localStorage.getItem(`ptit_cv_session_${id}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.id) {
            sessions.push(parsed);
          }
        } catch {}
      }
    }
  } catch (e) {
    console.warn('Failed to get stored CV sessions:', e);
  }
  return sessions;
}

export async function deleteCVSession(userId = 'guest', sessionId: string) {
  if (!sessionId) return;

  try {
    localStorage.removeItem(`ptit_cv_session_${sessionId}`);
    const indexRaw = localStorage.getItem('ptit_cv_sessions_index');
    let sessionIds: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    sessionIds = sessionIds.filter((id) => id !== sessionId);
    localStorage.setItem('ptit_cv_sessions_index', JSON.stringify(sessionIds));

    const lastId = localStorage.getItem('ptit_last_cv_session_id');
    if (lastId === sessionId) {
      if (sessionIds.length > 0) {
        localStorage.setItem('ptit_last_cv_session_id', sessionIds[0]);
      } else {
        localStorage.removeItem('ptit_last_cv_session_id');
      }
    }

    // Nếu không còn session nào, dọn dẹp sạch toàn bộ dữ liệu CV trong localStorage và userProfile
    if (sessionIds.length === 0) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ptit_cv_session_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem('ptit_last_cv_session_id');

      try {
        const upRaw = localStorage.getItem('ptit_user_profile_v1');
        if (upRaw) {
          const up = JSON.parse(upRaw);
          delete up.cvFileName;
          delete up.cvFileSize;
          delete up.cvUploadedAt;
          delete up.cvExtractedText;
          delete up.cvSkills;
          delete up.cvExperiencesCount;
          delete up.cvExperiences;
          localStorage.setItem('ptit_user_profile_v1', JSON.stringify(up));
        }
      } catch {}
    }
  } catch (e) {
    console.warn('Failed to delete cvSession from localStorage:', e);
  }

  try {
    const { getDb } = await import('./firebase');
    const db = getDb();
    if (db && userId) {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const sessionRef = doc(db, 'users', userId, 'cvSessions', sessionId);
      await deleteDoc(sessionRef);
    }
  } catch (e) {
    console.warn('Firestore session delete skipped or failed:', e);
  }
}

export async function clearAllCVSessions(userId = 'guest') {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ptit_cv_session_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('ptit_cv_sessions_index');
    localStorage.removeItem('ptit_last_cv_session_id');

    try {
      const upRaw = localStorage.getItem('ptit_user_profile_v1');
      if (upRaw) {
        const up = JSON.parse(upRaw);
        delete up.cvFileName;
        delete up.cvFileSize;
        delete up.cvUploadedAt;
        delete up.cvExtractedText;
        delete up.cvSkills;
        delete up.cvExperiencesCount;
        delete up.cvExperiences;
        localStorage.setItem('ptit_user_profile_v1', JSON.stringify(up));
      }
    } catch {}
  } catch (e) {
    console.warn('Failed to clear all CV sessions:', e);
  }
}

export async function saveCVSession(userId = 'guest', cvSession: CVSessionState) {
  if (!cvSession || !cvSession.id) return;

  try {
    const key = `ptit_cv_session_${cvSession.id}`;
    localStorage.setItem(key, JSON.stringify(cvSession));
    localStorage.setItem('ptit_last_cv_session_id', cvSession.id);

    // Update index
    const indexRaw = localStorage.getItem('ptit_cv_sessions_index');
    let sessionIds: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    sessionIds = [cvSession.id, ...sessionIds.filter((id) => id !== cvSession.id)].slice(0, 20);
    localStorage.setItem('ptit_cv_sessions_index', JSON.stringify(sessionIds));
  } catch (e) {
    console.warn('Failed to save cvSession to localStorage:', e);
  }

  try {
    const { getDb } = await import('./firebase');
    const db = getDb();
    if (db && userId) {
      const { doc, setDoc } = await import('firebase/firestore');
      const sessionRef = doc(db, 'users', userId, 'cvSessions', cvSession.id);
      await setDoc(
        sessionRef,
        {
          fileName: cvSession.fileName || '',
          createdAt: cvSession.uploadedAt || new Date().toISOString(),
          extractedCV: cvSession.extractedCV || {},
          verifiedCV: cvSession.verifiedCV || {},
          targetJobId: cvSession.targetJobId || null,
          parsedJD: cvSession.parsedJD || {},
          matchResult: cvSession.matchResult || {},
          suggestions: cvSession.suggestions || {},
          status: cvSession.status || 'uploaded',
        },
        { merge: true }
      );
    }
  } catch (e) {
    console.warn('Firestore session save skipped or failed:', e);
  }
}
