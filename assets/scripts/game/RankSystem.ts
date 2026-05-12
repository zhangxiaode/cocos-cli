/**
 * 段位系统 - 难度体系管理
 * 包含7个大段位，每个段位3个小段位
 * 升级规则：同级内小段位每升一级需要的星数翻倍，不同大段位相同位置升级需要的星数也翻倍
 */

export enum RankTier {
  BRONZE = 0,        // 倔强青铜
  SILVER = 1,        // 秩序白银
  GOLD = 2,          // 荣耀黄金
  PLATINUM = 3,      // 尊贵铂金
  DIAMOND = 4,       // 永恒钻石
  STARLIGHT = 5,     // 至尊星耀
  KING = 6,          // 最强王者
}

export enum RankPhase {
  EARLY = 0,         // 初期
  MID = 1,           // 中期
  LATE = 2,          // 后期
}

export interface RankInfo {
  tier: RankTier;    // 大段位
  phase: RankPhase;  // 小段位
  stars: number;     // 当前星数（0-升级所需星数之间）
}

export interface RankRequirement {
  tier: RankTier;
  phase: RankPhase;
  starsNeeded: number;
  description: string;
}

export class RankSystem {
  private static instance: RankSystem;
  private static readonly TIER_NAMES = [
    '倔强青铜',
    '秩序白银',
    '荣耀黄金',
    '尊贵铂金',
    '永恒钻石',
    '至尊星耀',
    '最强王者',
  ];

  private static readonly PHASE_NAMES = ['初期', '中期', '后期'];

  // 升级所需星数表
  // 第一维：大段位索引（0-6）
  // 第二维：升级阶段（初→中、中→后、后→下级初）
  // 起始值：[2, 4, 8]（青铜），每个大段位都是上一个的2倍
  private static readonly STARS_REQUIRED = [
    [2, 4, 8],         // 青铜：初→中(2) 中→后(4) 后→白银初(8)
    [4, 8, 16],        // 白银：初→中(4) 中→后(8) 后→黄金初(16)
    [8, 16, 32],       // 黄金：初→中(8) 中→后(16) 后→铂金初(32)
    [16, 32, 64],      // 铂金：初→中(16) 中→后(32) 后→钻石初(64)
    [32, 64, 128],     // 钻石：初→中(32) 中→后(64) 后→星耀初(128)
    [64, 128, 256],    // 星耀：初→中(64) 中→后(128) 后→王者初(256)
    [128, 256, 512],   // 王者：初→中(128) 中→后(256) 后→王者循环(512)
  ];

  private currentRank: RankInfo;

  private constructor() {
    this.currentRank = {
      tier: RankTier.BRONZE,
      phase: RankPhase.EARLY,
      stars: 0,
    };
  }

  public static getInstance(): RankSystem {
    if (!RankSystem.instance) {
      RankSystem.instance = new RankSystem();
    }
    return RankSystem.instance;
  }

  /**
   * 获取当前段位信息
   */
  public getCurrentRank(): RankInfo {
    return { ...this.currentRank };
  }

  /**
   * 设置当前段位
   */
  public setCurrentRank(tier: RankTier, phase: RankPhase, stars: number = 0) {
    this.currentRank = {
      tier: Math.max(0, Math.min(tier, 6)),
      phase: Math.max(0, Math.min(phase, 2)),
      stars: Math.max(0, stars),
    };
  }

  /**
   * 添加星数
   * @returns 是否升级，返回新的段位信息（升级时）或null（未升级时）
   */
  public addStars(count: number): RankInfo | null {
    if (count <= 0) return null;

    this.currentRank.stars += count;

    // 检查是否满足升级条件
    const starsNeeded = this.getStarsNeededForNextRank();
    if (this.currentRank.stars >= starsNeeded) {
      this.currentRank.stars -= starsNeeded;
      return this.promoteRank();
    }

    return null;
  }

  /**
   * 降低星数
   */
  public removeStars(count: number): boolean {
    if (count <= 0) return false;

    this.currentRank.stars -= count;

    // 如果星数低于0，需要降级
    while (this.currentRank.stars < 0) {
      if (!this.demoteRank()) {
        // 无法继续降级，已在最低段位
        this.currentRank.stars = 0;
        return false;
      }
      // 从当前段位的最大星数减去溢出的星数
      const maxStars = this.getStarsNeededForNextRank();
      this.currentRank.stars += maxStars;
    }

    return true;
  }

  /**
   * 升级处理
   */
  private promoteRank(): RankInfo {
    // 首先尝试在当前大段位内升级小段位
    if (this.currentRank.phase < RankPhase.LATE) {
      this.currentRank.phase += 1;
    } else {
      // 当前小段位已是后期，升级到下一个大段位的初期
      if (this.currentRank.tier < RankTier.KING) {
        this.currentRank.tier += 1;
        this.currentRank.phase = RankPhase.EARLY;
      } else {
        // 已是王者后期，保持不变（最高段位）
        this.currentRank.phase = RankPhase.LATE;
      }
    }

    return this.getCurrentRank();
  }

  /**
   * 降级处理
   */
  private demoteRank(): boolean {
    if (this.currentRank.phase > RankPhase.EARLY) {
      // 在当前大段位内降级
      this.currentRank.phase -= 1;
      return true;
    } else if (this.currentRank.tier > RankTier.BRONZE) {
      // 降级到上一个大段位的后期
      this.currentRank.tier -= 1;
      this.currentRank.phase = RankPhase.LATE;
      return true;
    } else {
      // 已在最低段位初期，无法继续降级
      return false;
    }
  }

  /**
   * 获取升级到下一个段位所需的星数
   */
  public getStarsNeededForNextRank(): number {
    const starsArray = RankSystem.STARS_REQUIRED[this.currentRank.tier];
    if (!starsArray) return 0;

    if (this.currentRank.phase === RankPhase.EARLY) {
      return starsArray[0]; // 初→中
    } else if (this.currentRank.phase === RankPhase.MID) {
      return starsArray[1]; // 中→后
    } else {
      return starsArray[2]; // 后→下级初
    }
  }

  /**
   * 获取当前段位的剩余星数（距离升级还需要多少星）
   */
  public getStarsRemaining(): number {
    const starsNeeded = this.getStarsNeededForNextRank();
    return Math.max(0, starsNeeded - this.currentRank.stars);
  }

  /**
   * 获取当前段位的升级进度百分比（0-100）
   */
  public getProgressPercentage(): number {
    const starsNeeded = this.getStarsNeededForNextRank();
    if (starsNeeded === 0) return 100;
    return Math.round((this.currentRank.stars / starsNeeded) * 100);
  }

  /**
   * 获取段位显示名称
   */
  public getRankDisplayName(tier?: RankTier, phase?: RankPhase): string {
    const t = tier !== undefined ? tier : this.currentRank.tier;
    const p = phase !== undefined ? phase : this.currentRank.phase;

    if (t < 0 || t >= RankSystem.TIER_NAMES.length) return '未知段位';
    if (p < 0 || p >= RankSystem.PHASE_NAMES.length) return '未知段位';

    return `${RankSystem.TIER_NAMES[t]} ${RankSystem.PHASE_NAMES[p]}`;
  }

  /**
   * 获取当前段位的完整显示名称
   */
  public getCurrentRankDisplayName(): string {
    return this.getRankDisplayName(this.currentRank.tier, this.currentRank.phase);
  }

  /**
   * 获取所有升级路径信息
   */
  public getAllRankPath(): RankRequirement[] {
    const path: RankRequirement[] = [];

    for (let tier = 0; tier < RankTier.KING + 1; tier++) {
      for (let phase = 0; phase < 3; phase++) {
        const starsArray = RankSystem.STARS_REQUIRED[tier];
        let starsNeeded = 0;

        if (phase === RankPhase.EARLY) {
          starsNeeded = starsArray[0];
        } else if (phase === RankPhase.MID) {
          starsNeeded = starsArray[1];
        } else {
          starsNeeded = starsArray[2];
        }

        path.push({
          tier: tier as RankTier,
          phase: phase as RankPhase,
          starsNeeded,
          description: this.getRankDisplayName(tier as RankTier, phase as RankPhase),
        });
      }
    }

    return path;
  }

  /**
   * 获取升级详情
   */
  public getRankDetails(): {
    currentRank: string;
    currentStars: number;
    starsNeeded: number;
    starsRemaining: number;
    progressPercentage: number;
    nextRank: string | null;
  } {
    const nextRankInfo = this.getNextRankInfo();

    return {
      currentRank: this.getCurrentRankDisplayName(),
      currentStars: this.currentRank.stars,
      starsNeeded: this.getStarsNeededForNextRank(),
      starsRemaining: this.getStarsRemaining(),
      progressPercentage: this.getProgressPercentage(),
      nextRank: nextRankInfo,
    };
  }

  /**
   * 获取下一个段位的显示名称
   */
  private getNextRankInfo(): string | null {
    const currentPhase = this.currentRank.phase;
    const currentTier = this.currentRank.tier;

    if (currentTier === RankTier.KING && currentPhase === RankPhase.LATE) {
      return null; // 王者后期是最高段位
    }

    if (currentPhase < RankPhase.LATE) {
      return this.getRankDisplayName(currentTier, currentPhase + 1);
    } else {
      if (currentTier < RankTier.KING) {
        return this.getRankDisplayName(currentTier + 1, RankPhase.EARLY);
      }
      return null;
    }
  }

  /**
   * 重置段位到初始状态
   */
  public resetRank() {
    this.currentRank = {
      tier: RankTier.BRONZE,
      phase: RankPhase.EARLY,
      stars: 0,
    };
  }

  /**
   * 获取总升级进度（从最低到最高的总进度）
   */
  public getTotalProgressFromBronze(): {
    totalStars: number;
    totalStarsNeeded: number;
    percentage: number;
  } {
    let totalStars = 0;
    let totalNeeded = 0;

    // 计算到达当前段位的总星数
    for (let t = 0; t < this.currentRank.tier; t++) {
      const starsArray = RankSystem.STARS_REQUIRED[t];
      totalStars += starsArray[0] + starsArray[1] + starsArray[2];
    }

    // 加上当前大段位内的星数
    const currentStarsArray = RankSystem.STARS_REQUIRED[this.currentRank.tier];
    for (let p = 0; p < this.currentRank.phase; p++) {
      totalStars += currentStarsArray[p];
    }
    totalStars += this.currentRank.stars;

    // 计算总共需要的星数（全部升级到王者后期）
    for (let t = 0; t <= RankTier.KING; t++) {
      const starsArray = RankSystem.STARS_REQUIRED[t];
      totalNeeded += starsArray[0] + starsArray[1] + starsArray[2];
    }

    return {
      totalStars,
      totalStarsNeeded: totalNeeded,
      percentage: Math.round((totalStars / totalNeeded) * 100),
    };
  }
}
