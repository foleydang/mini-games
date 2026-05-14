/**
 * 用户信息管理 - 微信小游戏用户授权
 */

// 用户信息缓存
let userInfo = null;
let userInfoButton = null;
let avatarImages = {};  // 头像图片缓存

// 获取本地存储的用户信息
export function getLocalUserInfo() {
  try {
    const saved = wx.getStorageSync('userInfo');
    if (saved) {
      userInfo = saved;
      return saved;
    }
  } catch (e) {}
  return null;
}

// 保存用户信息到本地
export function saveUserInfo(info) {
  userInfo = info;
  try {
    wx.setStorageSync('userInfo', info);
  } catch (e) {}
}

// 获取用户信息（优先本地缓存）
export function getUserInfo() {
  if (userInfo) return userInfo;
  return getLocalUserInfo();
}

// 预加载头像图片
export function preloadAvatar(ctx, avatarUrl) {
  if (!avatarUrl || avatarImages[avatarUrl]) return avatarImages[avatarUrl];
  
  try {
    if (ctx.createImage) {
      const img = ctx.createImage();
      img.src = avatarUrl;
      avatarImages[avatarUrl] = img;
      return img;
    }
  } catch (e) {}
  return null;
}

// 绘制头像（圆形裁剪）
export function drawAvatar(ctx, x, y, radius, avatarUrl) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  
  if (avatarUrl && avatarImages[avatarUrl]) {
    const img = avatarImages[avatarUrl];
    if (img.complete && img.width > 0) {
      ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
    } else {
      // 图片未加载完成，绘制占位
      ctx.fillStyle = '#e0e0e0';
      ctx.fill();
    }
  } else if (avatarUrl) {
    // 尝试加载图片
    const img = preloadAvatar(ctx, avatarUrl);
    if (img) {
      img.onload = () => {
        // 图片加载完成后需要重绘，这里先画占位符
      };
    }
    ctx.fillStyle = '#e0e0e0';
    ctx.fill();
  } else {
    // 没有头像，绘制默认
    ctx.fillStyle = '#e0e0e0';
    ctx.fill();
  }
  
  ctx.restore();
}

// 检查是否已授权
export function isAuthorized() {
  return getUserInfo() !== null;
}

// 创建授权按钮
export function createUserInfoButton(designSize, onSuccess, onFail) {
  if (userInfoButton) {
    userInfoButton.destroy();
  }
  
  const { width, height } = designSize;
  const info = wx.getSystemInfoSync();
  const ratio = info.screenWidth / width;
  
  const btnWidth = 200 / ratio;
  const btnHeight = 40 / ratio;
  const btnX = (info.screenWidth - btnWidth) / 2;
  const btnY = (info.screenHeight - btnHeight) / 2 + 80;
  
  try {
    userInfoButton = wx.createUserInfoButton({
      type: 'text',
      text: '点击授权',
      style: {
        left: btnX,
        top: btnY,
        width: btnWidth,
        height: btnHeight,
        lineHeight: btnHeight,
        backgroundColor: '#7c3aed',
        color: '#ffffff',
        textAlign: 'center',
        fontSize: 16,
        borderRadius: 20
      },
      withCredentials: false
    });
    
    userInfoButton.onTap((res) => {
      if (res.userInfo) {
        const info = {
          nickName: res.userInfo.nickName,
          avatarUrl: res.userInfo.avatarUrl
        };
        saveUserInfo(info);
        destroyUserInfoButton();
        onSuccess(info);
      } else {
        onFail && onFail(res);
      }
    });
    
    return userInfoButton;
  } catch (e) {
    console.log('创建授权按钮失败:', e);
    // 尝试使用旧版API
    try {
      wx.getUserInfo({
        success: (res) => {
          const info = {
            nickName: res.userInfo.nickName,
            avatarUrl: res.userInfo.avatarUrl
          };
          saveUserInfo(info);
          onSuccess(info);
        },
        fail: onFail
      });
    } catch (e2) {
      onFail && onFail({ errMsg: '不支持获取用户信息' });
    }
    return null;
  }
}

// 销毁授权按钮
export function destroyUserInfoButton() {
  if (userInfoButton) {
    userInfoButton.destroy();
    userInfoButton = null;
  }
}
