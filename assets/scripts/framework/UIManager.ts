import { _decorator, Node, Prefab, resources, instantiate, tween, UITransform, UIOpacity } from 'cc';
import { Singleton } from './Singleton';

const { ccclass } = _decorator;

@ccclass('UIManager')
export class UIManager extends Singleton<UIManager> {
    private _root: Node = null!;
    private _pageStack: { node: Node; path: string }[] = [];

    /**
     * 初始化UI管理器
     * @param root UI根节点
     */
    init(root: Node) {
        this._root = root;
    }

    /**
     * 打开新页面
     * @param prefabPath 预制体路径（resources/prefabs/pages/xxx）
     * @param params 传递给页面的参数
     * @param animation 是否显示切换动画
     */
    async openPage(prefabPath: string, params?: any, animation: boolean = true) {
        // 隐藏上一个页面
        if (this._pageStack.length > 0) {
            const lastPage = this._pageStack[this._pageStack.length - 1].node;
            lastPage.active = false;
        }

        // 加载并实例化页面
        const prefab = (await resources.load(prefabPath, Prefab)) as unknown as Prefab;
        const pageNode = instantiate(prefab) as Node;
        pageNode.parent = this._root;
        pageNode.getComponent(UITransform)!.setContentSize(this._root.getComponent(UITransform)!.contentSize);
        const pageOpacity = pageNode.addComponent(UIOpacity);

        // 传递参数
        if (pageNode.getComponent(prefab.data.name)) {
            const comp = pageNode.getComponent(prefab.data.name)!;
            if (comp['onShow']) {
                comp['onShow'](params);
            }
        }

        // 添加到页面栈
        this._pageStack.push({ node: pageNode, path: prefabPath });

        // 淡入动画
        if (animation) {
            pageOpacity.opacity = 0;
            tween(pageOpacity).to(0.3, { opacity: 255 }).start();
        }
    }

    /**
     * 返回上一页
     * @param animation 是否显示切换动画
     */
    backPage(animation: boolean = true) {
        if (this._pageStack.length <= 1) return;

        // 移除当前页面
        const current = this._pageStack.pop()!;
        const currentNode = current.node;

        // 淡出动画
        if (animation) {
            const currentOpacity = currentNode.getComponent(UIOpacity);
            tween(currentNode)
                .call(() => {
                    currentNode.destroy();
                    resources.release(current.path);
                })
                .start();

            if (currentOpacity) {
                tween(currentOpacity)
                    .to(0.3, { opacity: 0 })
                    .call(() => {
                        currentNode.destroy();
                        resources.release(current.path);
                    })
                    .start();
            }
        } else {
            currentNode.destroy();
            resources.release(current.path);
        }

        // 显示上一页
        const lastPage = this._pageStack[this._pageStack.length - 1].node;
        lastPage.active = true;

        if (animation) {
            const lastPageOpacity = lastPage.getComponent(UIOpacity) ?? lastPage.addComponent(UIOpacity);
            lastPageOpacity.opacity = 0;
            tween(lastPageOpacity).to(0.3, { opacity: 255 }).start();
        }
    }

    /**
     * 回到首页
     */
    backToHome() {
        while (this._pageStack.length > 1) {
            const current = this._pageStack.pop()!;
            current.node.destroy();
            resources.release(current.path);
        }

        const homePage = this._pageStack[0].node;
        homePage.active = true;
        const homePageOpacity = homePage.getComponent(UIOpacity) ?? homePage.addComponent(UIOpacity);
        homePageOpacity.opacity = 255;
    }

    /**
     * 获取当前页面
     */
    getCurrentPage(): Node | null {
        if (this._pageStack.length === 0) return null;
        return this._pageStack[this._pageStack.length - 1].node;
    }
}