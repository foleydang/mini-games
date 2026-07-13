/**
 * 内容安全模块 - UGC(用户产生内容)合规过滤
 *
 * 覆盖场景：自定义昵称等用户可编辑的文本内容。
 * 三层防护：
 *   1) 本地敏感词即时拦截（客户端，无网络也生效）
 *   2) 微信内容安全 API 云端复检（msgSecCheck / imgSecCheck，经自有后端调用）
 *   3) 展示端脱敏（渲染他人昵称等内容时对命中敏感词做掩码）
 *
 * 说明：微信 msgSecCheck/imgSecCheck 需要 access_token，只能在服务端调用。
 * 客户端通过自有后端接口 `${API_BASE}/security/*` 间接调用微信接口。
 */

const API_BASE = 'https://api.yanten.top/api/games';

// 本地敏感词库（政治有害 / 色情 / 赌博 / 违法违规 / 辱骂等类别代表词）。
// 仅作即时兜底，全面覆盖以微信云端 msgSecCheck 为准，可按需扩充。
const SENSITIVE_WORDS = [
  // 色情低俗
  '色情', '裸聊', '一夜情', '嫖娼', 'av女优', '成人电影', '做爱', '性交易',
  // 赌博
  '赌博', '博彩', '赌场', '六合彩', '时时彩', '押注', '老虎机', '百家乐',
  // 违法违规 / 诈骗 / 违禁品
  '毒品', '冰毒', '大麻', '枪支', '办证', '发票代开', '洗钱', '传销',
  '诈骗', '刷单', '外挂', '私服',
  // 辱骂 / 人身攻击（代表词）
  '傻逼', '傻B', '操你', '草泥马', 'nmsl', '狗娘养',
];

// 预编译为正则，忽略大小写；对特殊字符转义。
const SENSITIVE_REGEXPS = SENSITIVE_WORDS.map((w) => {
  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
});

/**
 * 本地检测文本是否命中敏感词。
 * @returns {boolean} true=命中敏感词（违规）
 */
export function containsSensitive(text) {
  if (!text || typeof text !== 'string') return false;
  const normalized = text.replace(/\s+/g, '');
  return SENSITIVE_REGEXPS.some((re) => re.test(normalized));
}

/**
 * 展示端脱敏：将命中的敏感词替换为等长的 *。
 * 用于渲染他人昵称等无法阻止其产生、但需避免展示的内容。
 */
export function maskSensitive(text) {
  if (!text || typeof text !== 'string') return text;
  let result = text;
  for (const word of SENSITIVE_WORDS) {
    if (!word) continue;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    result = result.replace(re, '*'.repeat(word.length));
  }
  return result;
}

/**
 * 通过自有后端调用微信 msgSecCheck 做云端文本安全复检。
 * 后端接口约定：POST ${API_BASE}/security/text-check { content }
 *   返回 { success: true, pass: true|false }
 * 后端负责调用微信 https://api.weixin.qq.com/wxa/msg_sec_check (v2, scene=1)。
 * @returns {Promise<boolean>} true=通过云端检查；后端不可用时 resolve(null) 视为跳过
 */
function remoteTextCheck(content) {
  let openid = '';
  try { openid = wx.getStorageSync('game_openid') || ''; } catch (e) {}
  return new Promise((resolve) => {
    wx.request({
      url: `${API_BASE}/security/text-check`,
      method: 'POST',
      data: { content, openid },  // msgSecCheck v2 需要真实微信 openid
      header: { 'content-type': 'application/json' },
      success: (res) => {
        if (res && res.data && res.data.success === true) {
          resolve(res.data.pass !== false);
        } else {
          // 后端未部署该接口或返回异常，跳过云端检查（不阻断，依赖本地过滤）
          resolve(null);
        }
      },
      fail: () => resolve(null),
    });
  });
}

/**
 * 文本安全校验（昵称等 UGC 入口调用）。
 * 先本地强拦截，再云端复检。
 * @returns {Promise<{ pass: boolean, reason?: string }>}
 */
export async function checkTextSecurity(text) {
  if (containsSensitive(text)) {
    return { pass: false, reason: 'local' };
  }
  const remote = await remoteTextCheck(text);
  if (remote === false) {
    return { pass: false, reason: 'remote' };
  }
  return { pass: true };
}

/**
 * 图片安全校验（预留）。当前项目头像为预设颜色，无用户上传图片场景。
 * 若后续支持用户自定义/上传头像，在上传前调用本方法。
 * 后端接口约定：POST ${API_BASE}/security/img-check { mediaUrl } 或走 uploadFile，
 * 后端调用微信 imgSecCheck。
 * @returns {Promise<{ pass: boolean, reason?: string }>}
 */
export function checkImageSecurity(filePath) {
  return new Promise((resolve) => {
    if (!filePath) {
      resolve({ pass: true });
      return;
    }
    wx.uploadFile({
      url: `${API_BASE}/security/img-check`,
      filePath,
      name: 'media',
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          if (data && data.success === true) {
            resolve({ pass: data.pass !== false, reason: 'remote' });
            return;
          }
        } catch (e) {}
        // 后端不可用，无法校验图片时保守放行（无本地兜底手段）
        resolve({ pass: true });
      },
      fail: () => resolve({ pass: true }),
    });
  });
}
