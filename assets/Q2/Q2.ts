/**
按照要求在 {@link Q2.onStartBtnClick} 中编写一段异步任务处理逻辑，具体执行步骤如下：
1. 调用 {@link Q2.loadConfig} 加载配置文件，获取资源列表
2. 根据资源列表调用 {@link Q2.loadFile} 加载资源文件
3. 资源列表中的所有文件加载完毕后，调用 {@link Q2.initSystem} 进行系统初始化
4. 系统初始化完成后，打印日志

- 附加要求
1. 加载文件时，需要做并发控制，最多并发 3 个文件
2. 加载文件时，需要添加超时控制，超时时间为 5 秒
3. 加载文件失败时，需要对单文件做 backoff retry 处理，重试次数为 3 次
4. 对错误进行捕获并打印输出
*/

const {ccclass, property} = cc._decorator;

@ccclass
export default class Q2 extends cc.Component {
    public async onStartBtnClick() {
        try {
            // Step 1: 加载配置，获取资源列表
            const files = await this.loadConfig();

            // 辅助函数：带超时的文件加载（5 秒）
            const loadFileWithTimeout = (file: string): Promise<void> => {
                return new Promise((resolve, reject) => {
                    const timer = setTimeout(() => {
                        reject(new Error(`load file timeout: ${file}`));
                    }, 5000);
                    this.loadFile(file)
                        .then(() => { clearTimeout(timer); resolve(); })
                        .catch((err) => { clearTimeout(timer); reject(err); });
                });
            };

            // 辅助函数：带 backoff retry 的文件加载（最多重试 3 次）
            const loadFileWithRetry = async (file: string): Promise<void> => {
                const MAX_RETRIES = 3;
                for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                    try {
                        await loadFileWithTimeout(file);
                        return;
                    } catch (err) {
                        if (attempt < MAX_RETRIES) {
                            const delay = Math.pow(2, attempt) * 1000; // 指数退避：1s, 2s, 4s
                            console.log(`load file retry (${attempt + 1}/${MAX_RETRIES}): ${file}, wait ${delay}ms`);
                            await new Promise(res => setTimeout(res, delay));
                        } else {
                            throw err;
                        }
                    }
                }
            };

            // Step 2: 并发加载资源文件，最多 3 个并发
            const MAX_CONCURRENCY = 3;
            let cursor = 0;

            const worker = async (): Promise<void> => {
                while (cursor < files.length) {
                    const file = files[cursor++];
                    try {
                        await loadFileWithRetry(file);
                    } catch (err) {
                        console.error(`load file failed after all retries: ${file}`, err);
                    }
                }
            };

            const workers: Promise<void>[] = [];
            for (let i = 0; i < Math.min(MAX_CONCURRENCY, files.length); i++) {
                workers.push(worker());
            }
            await Promise.all(workers);

            // Step 3: 所有文件加载完毕后，进行系统初始化
            await this.initSystem();

            // Step 4: 打印日志
            console.log('All files loaded and system initialized successfully.');
        } catch (err) {
            console.error('onStartBtnClick encountered an error:', err);
        }
    }

    // #region 以下是辅助测试题而写的一些 mock 函数，请勿修改

    /**
     * 加载配置文件
     * @returns 文件列表
     */
    public async loadConfig(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            console.log('load config start');
            setTimeout(() => {
                if (Math.random() > 0.01) {
                    console.log('load config success');
                    const files: string[] = [];
                    for (let i = 0; i < 100; i++) {
                        files.push(`file-${i}`);
                    }
                    resolve(files);
                } else {
                    console.log('load config failed');
                    reject();
                }
            }, 1000);
        });
    }

    /**
     * 加载文件
     * @param file 
     * @returns 
     */
    public async loadFile(file: string): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`load file start: ${file}`);
            setTimeout(() => {
                if (Math.random() > 0.01) {
                    console.log(`load file success: ${file}`);
                    resolve();
                } else {
                    console.log(`load file failed: ${file}`);
                    reject();
                }
            }, Math.floor(Math.random() * 2000) + 1000);
        });
    }

    /**
     * 初始化系统
     * @returns 
     */
    public async initSystem(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('init system start');
            setTimeout(() => {
                console.log('init system success');
                resolve();
            }, 1000);
        });
    }

    // #endregion
}
