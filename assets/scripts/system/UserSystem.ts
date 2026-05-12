/**
 * 用户系统 - 管理用户信息
 * 包含用户名、等级(星数)、头像等信息
 * 游戏启动时自动创建或读取用户数据，数据存储在本地
 */

export interface UserData {
  userId: string;           // 用户ID (UUID)
  username: string;         // 用户名
  stars: number;            // 星数（等级）
  avatarUrl: string | null; // 头像URL (暂时置空)
  createTime: number;       // 创建时间戳
  lastLoginTime: number;    // 最后登录时间戳
}

export class UserSystem {
  private static instance: UserSystem;
  private static readonly STORAGE_KEY = 'kuaimaolan_user_data';
  private static readonly MAX_USERNAME_LENGTH = 20;

  private userData: UserData | null = null;

  private constructor() {}

  public static getInstance(): UserSystem {
    if (!UserSystem.instance) {
      UserSystem.instance = new UserSystem();
    }
    return UserSystem.instance;
  }

  /**
   * 初始化用户系统 - 游戏启动时调用
   * 优先读取本地数据，如果不存在则创建新用户
   */
  public initialize(): UserData {
    // 尝试从本地读取用户数据
    const storedData = this.loadFromLocalStorage();

    if (storedData) {
      this.userData = storedData;
      // 更新最后登录时间
      this.userData.lastLoginTime = Date.now();
      this.saveToLocalStorage();
      console.log(`用户登录成功: ${this.userData.username}`);
      return this.userData;
    }

    // 本地不存在用户数据，创建新用户
    const newUser = this.createNewUser();
    this.userData = newUser;
    this.saveToLocalStorage();
    console.log(`新用户创建成功: ${this.userData.username}`);
    return newUser;
  }

  /**
   * 创建新用户
   */
  private createNewUser(): UserData {
    return {
      userId: this.generateUserId(),
      username: this.generateDefaultUsername(),
      stars: 0,
      avatarUrl: null,
      createTime: Date.now(),
      lastLoginTime: Date.now(),
    };
  }

  /**
   * 生成用户ID (UUID)
   */
  private generateUserId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 生成默认用户名
   */
  private generateDefaultUsername(): string {
    const adjectives = [
      '神秘',
      '勇敢',
      '聪慧',
      '俊美',
      '高尚',
      '优雅',
      '威武',
      '睿智',
      '灿烂',
      '非凡',
      '杰出',
      '伟大',
    ];
    const nouns = [
      '剑客',
      '骑士',
      '术士',
      '猎手',
      '盗贼',
      '圣骑',
      '法师',
      '射手',
      '战士',
      '智者',
      '诗人',
      '骑兵',
    ];
    const randomNum = Math.floor(Math.random() * 10000);

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${adjective}${noun}${randomNum}`;
  }

  /**
   * 修改用户名
   */
  public setUsername(newUsername: string): boolean {
    if (!this.userData) {
      console.error('用户数据未初始化');
      return false;
    }

    if (!newUsername || newUsername.trim().length === 0) {
      console.error('用户名不能为空');
      return false;
    }

    if (newUsername.length > UserSystem.MAX_USERNAME_LENGTH) {
      console.error(`用户名长度不能超过 ${UserSystem.MAX_USERNAME_LENGTH} 个字符`);
      return false;
    }

    this.userData.username = newUsername.trim();
    this.saveToLocalStorage();
    console.log(`用户名已修改为: ${this.userData.username}`);
    return true;
  }

  /**
   * 获取用户名
   */
  public getUsername(): string {
    return this.userData?.username ?? '未知用户';
  }

  /**
   * 获取用户ID
   */
  public getUserId(): string {
    return this.userData?.userId ?? '';
  }

  /**
   * 获取用户星数
   */
  public getStars(): number {
    return this.userData?.stars ?? 0;
  }

  /**
   * 设置用户星数
   */
  public setStars(stars: number): boolean {
    if (!this.userData) {
      console.error('用户数据未初始化');
      return false;
    }

    if (stars < 0) {
      console.error('星数不能为负数');
      return false;
    }

    this.userData.stars = stars;
    this.saveToLocalStorage();
    return true;
  }

  /**
   * 添加星数
   */
  public addStars(count: number): number {
    if (!this.userData) {
      console.error('用户数据未初始化');
      return 0;
    }

    if (count < 0) {
      console.error('添加的星数不能为负数');
      return this.userData.stars;
    }

    this.userData.stars += count;
    this.saveToLocalStorage();
    console.log(`添加了 ${count} 颗星，当前总星数: ${this.userData.stars}`);
    return this.userData.stars;
  }

  /**
   * 扣除星数
   */
  public removeStars(count: number): number {
    if (!this.userData) {
      console.error('用户数据未初始化');
      return 0;
    }

    if (count < 0) {
      console.error('扣除的星数不能为负数');
      return this.userData.stars;
    }

    this.userData.stars = Math.max(0, this.userData.stars - count);
    this.saveToLocalStorage();
    console.log(`扣除了 ${count} 颗星，当前总星数: ${this.userData.stars}`);
    return this.userData.stars;
  }

  /**
   * 设置用户头像
   */
  public setAvatarUrl(url: string | null): boolean {
    if (!this.userData) {
      console.error('用户数据未初始化');
      return false;
    }

    this.userData.avatarUrl = url;
    this.saveToLocalStorage();
    return true;
  }

  /**
   * 获取用户头像
   */
  public getAvatarUrl(): string | null {
    return this.userData?.avatarUrl ?? null;
  }

  /**
   * 获取完整用户数据
   */
  public getUserData(): UserData | null {
    return this.userData ? { ...this.userData } : null;
  }

  /**
   * 获取用户详细信息
   */
  public getUserDetails(): {
    userId: string;
    username: string;
    stars: number;
    avatarUrl: string | null;
    createTime: string;
    lastLoginTime: string;
  } | null {
    if (!this.userData) return null;

    return {
      userId: this.userData.userId,
      username: this.userData.username,
      stars: this.userData.stars,
      avatarUrl: this.userData.avatarUrl,
      createTime: new Date(this.userData.createTime).toLocaleString(),
      lastLoginTime: new Date(this.userData.lastLoginTime).toLocaleString(),
    };
  }

  /**
   * 重置用户数据（恢复初始状态）
   */
  public resetUserData(): void {
    this.userData = this.createNewUser();
    this.saveToLocalStorage();
    console.log('用户数据已重置');
  }

  /**
   * 删除用户数据
   */
  public deleteUserData(): void {
    this.userData = null;
    this.clearLocalStorage();
    console.log('用户数据已删除');
  }

  /**
   * 保存数据到本地存储
   */
  private saveToLocalStorage(): void {
    try {
      if (this.userData) {
        const dataJson = JSON.stringify(this.userData);
        localStorage.setItem(UserSystem.STORAGE_KEY, dataJson);
      }
    } catch (error) {
      console.error('保存用户数据到本地存储失败:', error);
    }
  }

  /**
   * 从本地存储读取数据
   */
  private loadFromLocalStorage(): UserData | null {
    try {
      const dataJson = localStorage.getItem(UserSystem.STORAGE_KEY);
      if (dataJson) {
        const data = JSON.parse(dataJson) as UserData;
        // 验证数据的完整性
        if (this.isValidUserData(data)) {
          return data;
        }
      }
    } catch (error) {
      console.error('从本地存储读取用户数据失败:', error);
    }
    return null;
  }

  /**
   * 清除本地存储
   */
  private clearLocalStorage(): void {
    try {
      localStorage.removeItem(UserSystem.STORAGE_KEY);
    } catch (error) {
      console.error('清除本地存储失败:', error);
    }
  }

  /**
   * 验证用户数据的完整性
   */
  private isValidUserData(data: any): boolean {
    return (
      data &&
      typeof data.userId === 'string' &&
      typeof data.username === 'string' &&
      typeof data.stars === 'number' &&
      typeof data.createTime === 'number' &&
      typeof data.lastLoginTime === 'number'
    );
  }

  /**
   * 导出用户数据为JSON
   */
  public exportUserData(): string {
    if (!this.userData) {
      return '{}';
    }
    return JSON.stringify(this.userData, null, 2);
  }

  /**
   * 导入用户数据（用于数据恢复）
   */
  public importUserData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData) as UserData;
      if (this.isValidUserData(data)) {
        this.userData = data;
        this.saveToLocalStorage();
        console.log('用户数据导入成功');
        return true;
      } else {
        console.error('用户数据格式不正确');
        return false;
      }
    } catch (error) {
      console.error('导入用户数据失败:', error);
      return false;
    }
  }
}
