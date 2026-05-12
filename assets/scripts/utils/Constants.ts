export type MiniGamePlatform = 'wechat' | 'douyin' | 'unknown';

export interface GameInfo {
	appName: string;
	appId: string;
	envVersion: 'develop' | 'trial' | 'release';
	version: string;
	buildNumber: number;
	apiBaseUrl: string;
	shareTitle: string;
	shareImage: string;
	privacyPolicyUrl: string;
	serviceEmail: string;
	adUnitIds: {
		banner: string;
		rewardedVideo: string;
		interstitial: string;
	};
}

export const GAME_INFO_CONFIG: Record<'wechat' | 'douyin', GameInfo> = {
	wechat: {
		appName: '小游戏模板-微信',
		appId: 'wx_your_app_id',
		envVersion: 'develop',
		version: '0.1.0',
		buildNumber: 1,
		apiBaseUrl: 'https://api-wechat.example.com/v1',
		shareTitle: '来试试这个微信小游戏模板',
		shareImage: 'images/share/wechat-share.png',
		privacyPolicyUrl: 'https://example.com/wechat/privacy',
		serviceEmail: 'support-wechat@example.com',
		adUnitIds: {
			banner: 'wechat-banner-unit-id',
			rewardedVideo: 'wechat-rewarded-unit-id',
			interstitial: 'wechat-interstitial-unit-id'
		}
	},
	douyin: {
		appName: '小游戏模板-抖音',
		appId: 'tt_your_app_id',
		envVersion: 'develop',
		version: '0.1.0',
		buildNumber: 1,
		apiBaseUrl: 'https://api-douyin.example.com/v1',
		shareTitle: '来试试这个抖音小游戏模板',
		shareImage: 'images/share/douyin-share.png',
		privacyPolicyUrl: 'https://example.com/douyin/privacy',
		serviceEmail: 'support-douyin@example.com',
		adUnitIds: {
			banner: 'douyin-banner-unit-id',
			rewardedVideo: 'douyin-rewarded-unit-id',
			interstitial: 'douyin-interstitial-unit-id'
		}
	}
};

export function getCurrentPlatform(): MiniGamePlatform {
	const runtime = globalThis as any;

	if (runtime.wx && typeof runtime.wx.getSystemInfoSync === 'function') {
		return 'wechat';
	}

	if (runtime.tt && typeof runtime.tt.getSystemInfoSync === 'function') {
		return 'douyin';
	}

	return 'unknown';
}

export function getPlatformGameInfo(platform?: MiniGamePlatform): GameInfo {
	const current = platform ?? getCurrentPlatform();

	if (current === 'douyin') {
		return GAME_INFO_CONFIG.douyin;
	}

	return GAME_INFO_CONFIG.wechat;
}
