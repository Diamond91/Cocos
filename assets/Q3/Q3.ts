/*
请仔细观察根目录中提供的知名消除游戏 Candy Crush 录屏中，选关界面对话框 Play 按钮的动画效果，请复刻这一效果，使用代码实现或者 Animation 均可，动画包括：
- 按钮出现
- 按钮待机
- 按钮按下
- 按钮弹起
*/

const { ccclass, property } = cc._decorator;

@ccclass
export default class Q3 extends cc.Component {

    @property(cc.Node)
    private playNode: cc.Node = null;

    // ── 待机动画状态 ──────────────────────────────────────────────
    /** 待机计时器（秒） */
    private idleTime: number = 0;
    /** 待机动画是否正在运行 */
    private isIdleRunning: boolean = false;

    // ── 按压状态 ──────────────────────────────────────────────────
    /**
     * 按压缩放系数：正常=1.0，按下=0.9
     * 待机动画始终在此基准上叠加 squash-stretch 效果
     */
    private baseScale: number = 1.0;
    /** 是否处于出现动画中（阻止触摸响应） */
    private isAppearing: boolean = false;

    // ── 震动状态 ──────────────────────────────────────────────────
    /** 剩余震动时长（秒） */
    private shakeDuration: number = 0;    /** 震动初始总时长（秒），用于计算线性衰减比率 */
    private initialShakeDuration: number = 0;    /** 震动最大偏移（像素） */
    private shakeIntensity: number = 0;
    /** 节点静止时的原始坐标 */
    private baseX: number = 0;
    private baseY: number = 0;

    // ── 颜色 tween 引用（用于中途打断） ──────────────────────────
    private colorTween: cc.Tween = null;

    // ─────────────────────────────────────────────────────────────

    onLoad() {
        // 记录节点起始位置，震动时以此为基准
        this.baseX = this.playNode.x;
        this.baseY = this.playNode.y;

        // 初始隐藏，等待出现动画
        this.playNode.active = false;
        this.playNode.scale  = 0;
        this.playNode.angle  = 0;
        this.playNode.color  = cc.Color.WHITE;

        // 注册触摸事件
        this.playNode.on(cc.Node.EventType.TOUCH_START,  this.onBtnPress,   this);
        this.playNode.on(cc.Node.EventType.TOUCH_END,    this.onBtnRelease, this);
        this.playNode.on(cc.Node.EventType.TOUCH_CANCEL, this.onBtnRelease, this);
    }

    start() {
        // 自动播放出现动画
        this.playAppearAnimation();
    }

    onDestroy() {
        this.playNode.off(cc.Node.EventType.TOUCH_START,  this.onBtnPress,   this);
        this.playNode.off(cc.Node.EventType.TOUCH_END,    this.onBtnRelease, this);
        this.playNode.off(cc.Node.EventType.TOUCH_CANCEL, this.onBtnRelease, this);
    }

    // ─────────────────────────────────────────────────────────────
    // 出现动画
    // 按钮从 scale=0 弹出至略大于 1，随后左右摇摆稳定至水平位置
    // ─────────────────────────────────────────────────────────────
    private playAppearAnimation() {
        this.isAppearing    = true;
        this.isIdleRunning  = false;
        this.baseScale      = 1.0;

        this.playNode.active = true;
        this.playNode.scale  = 0;
        this.playNode.angle  = 0;
        this.playNode.color  = cc.Color.WHITE;

        // 先停掉可能残留的颜色 tween
        if (this.colorTween) { this.colorTween.stop(); this.colorTween = null; }

        // 用计数器等待两条 tween 均结束后再开启待机动画
        let finishedCount = 0;
        const onFinish = () => {
            finishedCount++;
            if (finishedCount >= 2) {
                this.isAppearing   = false;
                this.isIdleRunning = true;
            }
        };

        // ── tween 1：scale 0 → 1（backOut 弹性缓动，~~0.55 s）
        cc.tween(this.playNode)
            .to(0.55, { scale: 1.0 }, { easing: 'backOut' })
            .call(onFinish)
            .start();

        // ── tween 2：上下摇摆（稍延迟 0.10 s 后启动，与放大同步进行）
        cc.tween(this.playNode)
            .delay(0.10)
            .to(0.12, { angle: -20 })
            .to(0.12, { angle:  16 })
            .to(0.10, { angle: -11 })
            .to(0.10, { angle:   8 })
            .to(0.10, { angle:  -4 })
            .to(0.11, { angle:   0 }, { easing: 'sineOut' })
            .call(onFinish)
            .start();
    }

    // ─────────────────────────────────────────────────────────────
    // 每帧更新：待机 squash-stretch + 震动偏移
    // ─────────────────────────────────────────────────────────────
    update(dt: number) {
        // 出现动画期间由 tween 全权控制，update 不干预
        if (this.isAppearing) return;

        // ── 待机 squash-stretch ───────────────────────────────────
        // scaleX 与 scaleY 反相，营造按钮"呼吸"感
        // 周期 ~1.4 秒；幅度 ±6%
        if (this.isIdleRunning) {
            this.idleTime += dt;
            const phase  = Math.sin(this.idleTime * Math.PI * 2 / 1.4);
            this.playNode.scaleX = this.baseScale * (1.0 + phase *  0.06);
            this.playNode.scaleY = this.baseScale * (1.0 + phase * -0.06);
        }

        // ── 震动 ─────────────────────────────────────────────────
        if (this.shakeDuration > 0) {
            this.shakeDuration -= dt;
            if (this.shakeDuration <= 0) {
                this.shakeDuration = 0;
                this.playNode.x    = this.baseX;
                this.playNode.y    = this.baseY;
            } else {
                // 震动强度随剩余时间线性衰减（ratio 从 1 降至 0）
                const ratio = this.shakeDuration / this.initialShakeDuration;
                const amp   = this.shakeIntensity * ratio;
                this.playNode.x = this.baseX + (Math.random() - 0.5) * 2 * amp;
                this.playNode.y = this.baseY + (Math.random() - 0.5) * 2 * amp;
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 按下动画
    // 按钮缩小至 0.9、置灰、触发震动；待机 squash-stretch 继续
    // ─────────────────────────────────────────────────────────────
    private onBtnPress() {
        if (this.isAppearing) return;

        // 更新基准缩放（待机动画在新基准上叠加）
        this.baseScale = 0.9;

        // 颜色置灰
        if (this.colorTween) { this.colorTween.stop(); }
        this.colorTween = cc.tween(this.playNode.children[0])
            .to(0.08, { color: new cc.Color(150, 150, 150, 255) })
            .start();

        // 震动：持续 0.25 秒，最大偏移 8 px
        this.startShake(0.25, 8);
    }

    // ─────────────────────────────────────────────────────────────
    // 弹起动画
    // 按钮恢复原始大小、取消置灰、触发震动；待机 squash-stretch 继续
    // ─────────────────────────────────────────────────────────────
    private onBtnRelease() {
        if (this.isAppearing) return;

        // 恢复基准缩放
        this.baseScale = 1.0;

        // 恢复白色
        if (this.colorTween) { this.colorTween.stop(); }
        this.colorTween = cc.tween(this.playNode.children[0])
            .to(0.12, { color: cc.Color.WHITE })
            .start();

        // 震动：稍弱，持续 0.2 秒，最大偏移 5 px
        this.startShake(0.20, 5);
    }

    // ─────────────────────────────────────────────────────────────
    // 触发震动（正态衰减）
    // duration: 持续秒数；intensity: 最大像素偏移
    // ─────────────────────────────────────────────────────────────
    private startShake(duration: number, intensity: number) {
        this.shakeDuration        = duration;
        this.initialShakeDuration = duration;
        this.shakeIntensity       = intensity;
    }

    // ─────────────────────────────────────────────────────────────
    // 外部按钮绑定：点击"显示按钮"时重新播放出现动画
    // ─────────────────────────────────────────────────────────────
    private onShowBtnClick() {
        this.playAppearAnimation();
    }
}
