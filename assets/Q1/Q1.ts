/**
界面上有三个输入框，分别对应 X,Y,Z 的值，请实现 {@link Q1.onGenerateBtnClick} 函数，生成一个 10 × 10 的可控随机矩阵，并显示到界面上，矩阵要求如下：
1. {@link COLORS} 中预定义了 5 种颜色
2. 每个点可选 5 种颜色中的 1 种
3. 按照从左到右，从上到下的顺序，依次为每个点生成颜色，(0, 0)为左上⻆点，(9, 9)为右下⻆点，(0, 9)为右上⻆点
4. 点(0, 0)随机在 5 种颜色中选取
5. 其他各点的颜色计算规则如下，设目标点坐标为(m, n）：
    a. (m, n - 1)所属颜色的概率为基准概率加 X%
    b. (m - 1, n)所属颜色的概率为基准概率加 Y%
    c. 如果(m, n - 1)和(m - 1, n)同色，则该颜色的概率为基准概率加 Z%
    d. 其他颜色平分剩下的概率
*/

const {ccclass, property} = cc._decorator;

const COLORS = [
    cc.Color.RED,
    cc.Color.GREEN,
    cc.Color.BLUE,
    cc.Color.YELLOW,
    cc.Color.ORANGE,
];

// 每个格子的大小
const GRID_ITEM_SIZE = 60;

@ccclass
export default class Q1 extends cc.Component {

    @property(cc.EditBox)
    private xEditBox: cc.EditBox = null;

    @property(cc.EditBox)
    private yEditBox: cc.EditBox = null;

    @property(cc.EditBox)
    private zEditBox: cc.EditBox = null;

    @property(cc.Node)
    private gridRootNode: cc.Node = null;

    @property(cc.Prefab)
    private gridItemPrefab: cc.Prefab = null;

    public onGenerateBtnClick() {
        const X = parseFloat(this.xEditBox.string) || 0;
        const Y = parseFloat(this.yEditBox.string) || 0;
        const Z = parseFloat(this.zEditBox.string) || 0;

        const ROWS = 10;
        const COLS = 10;
        const NUM_COLORS = COLORS.length; // 5
        const BASE_PROB = 100 / NUM_COLORS; // 20%

        // grid[m][n] 存储颜色索引 (0~4)，m 为行（从上到下），n 为列（从左到右）
        const grid: number[][] = [];

        /** 按概率数组加权随机选取颜色索引 */
        const weightedRandom = (probs: number[]): number => {
            const rand = Math.random() * 100;
            let cumulative = 0;
            for (let c = 0; c < probs.length; c++) {
                cumulative += probs[c];
                if (rand < cumulative) return c;
            }
            return probs.length - 1;
        };

        for (let m = 0; m < ROWS; m++) {
            grid[m] = [];
            for (let n = 0; n < COLS; n++) {
                if (m === 0 && n === 0) {
                    // (0,0) 完全随机
                    grid[m][n] = Math.floor(Math.random() * NUM_COLORS);
                    continue;
                }

                const hasLeft  = n > 0;
                const hasUpper = m > 0;
                const probs    = new Array(NUM_COLORS).fill(0);

                if (hasLeft && hasUpper) {
                    const leftColor  = grid[m][n - 1];
                    const upperColor = grid[m - 1][n];

                    if (leftColor === upperColor) {
                        // 同色：该颜色概率 = 基准 + Z%，其余 4 色平分剩余
                        probs[leftColor] = BASE_PROB + Z;
                        const otherProb  = (100 - probs[leftColor]) / (NUM_COLORS - 1);
                        for (let c = 0; c < NUM_COLORS; c++) {
                            if (c !== leftColor) probs[c] = otherProb;
                        }
                    } else {
                        // 不同色：分别加 X% 和 Y%，其余 3 色平分剩余
                        probs[leftColor]  = BASE_PROB + X;
                        probs[upperColor] = BASE_PROB + Y;
                        const otherProb   = (100 - probs[leftColor] - probs[upperColor]) / (NUM_COLORS - 2);
                        for (let c = 0; c < NUM_COLORS; c++) {
                            if (c !== leftColor && c !== upperColor) probs[c] = otherProb;
                        }
                    }
                } else if (hasLeft) {
                    // 仅有左邻（第一行，n > 0）
                    const leftColor  = grid[m][n - 1];
                    probs[leftColor] = BASE_PROB + X;
                    const otherProb  = (100 - probs[leftColor]) / (NUM_COLORS - 1);
                    for (let c = 0; c < NUM_COLORS; c++) {
                        if (c !== leftColor) probs[c] = otherProb;
                    }
                } else {
                    // 仅有上邻（第一列，m > 0）
                    const upperColor  = grid[m - 1][n];
                    probs[upperColor] = BASE_PROB + Y;
                    const otherProb   = (100 - probs[upperColor]) / (NUM_COLORS - 1);
                    for (let c = 0; c < NUM_COLORS; c++) {
                        if (c !== upperColor) probs[c] = otherProb;
                    }
                }

                grid[m][n] = weightedRandom(probs);
            }
        }

        // ---- 渲染到界面 ----
        this.gridRootNode.removeAllChildren();

        for (let m = 0; m < ROWS; m++) {
            for (let n = 0; n < COLS; n++) {
                const item = cc.instantiate(this.gridItemPrefab);
                this.gridRootNode.addChild(item);

                // Cocos 坐标：x 向右为正，y 向上为正，以 gridRootNode 中心为原点
                item.x = (n - (COLS - 1) / 2) * GRID_ITEM_SIZE;
                item.y = ((ROWS - 1) / 2 - m) * GRID_ITEM_SIZE;

                // 设置颜色（优先找 Sprite，再回退到节点颜色）
                const sprite = item.getComponent(cc.Sprite);
                if (sprite) {
                    sprite.node.color = COLORS[grid[m][n]];
                } else {
                    item.color = COLORS[grid[m][n]];
                }
            }
        }
    }
}
