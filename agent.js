import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Command } from 'commander';
import { react_system_prompt_template } from './prompt_template.js';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReActAgent {
    constructor(tools, model, projectDirectory) {
        this.tools = {};
        tools.forEach(func => {
            this.tools[func.name] = func;
        });
        this.model = model;
        this.projectDirectory = projectDirectory;
        this.client = new OpenAI({
            baseURL: "https://api-inference.modelscope.cn/v1/",
            apiKey: ReActAgent.getApiKey(),
        });
    }

    async run(userInput) {
        const messages = [
            { role: "system", content: this.renderSystemPrompt(react_system_prompt_template) },
            { role: "user", content: `<question>${userInput}</question>` }
        ];

        while (true) {
            const content = await this.callModel(messages);

            const thoughtMatch = content.match(/<thought>(.*?)<\/thought>/s);
            if (thoughtMatch) {
                console.log(`\n\n💭 Thought: ${thoughtMatch[1]}`);
            }

            if (content.includes("<final_answer>")) {
                const finalAnswer = content.match(/<final_answer>(.*?)<\/final_answer>/s);
                return finalAnswer[1];
            }

            const actionMatch = content.match(/<action>(.*?)<\/action>/s);
            if (!actionMatch) {
                throw new Error("模型未输出 <action>");
            }
            
            const action = actionMatch[1];
            const [toolName, args] = this.parseAction(action);

            console.log(`\n\n🔧 Action: ${toolName}(${args.join(', ')})`);
            
            let shouldContinue = "y";
            if (toolName === "runTerminalCommand" || toolName === "run_terminal_command") {
                shouldContinue = await this.getUserInput("\n\n是否继续？（Y/N）");
            }
            
            if (shouldContinue.toLowerCase() !== 'y') {
                console.log("\n\n操作已取消。");
                return "操作被用户取消";
            }

            try {
                const observation = await this.tools[toolName](...args);
                console.log(`\n\n🔍 Observation：${observation}`);
                messages.push({ role: "user", content: `<observation>${observation}</observation>` });
            } catch (error) {
                const observation = `工具执行错误：${error.message}`;
                console.log(`\n\n🔍 Observation：${observation}`);
                messages.push({ role: "user", content: `<observation>${observation}</observation>` });
            }
        }
    }

    getToolList() {
        const toolDescriptions = [];
        for (const [name, func] of Object.entries(this.tools)) {
            const signature = this.getFunctionSignature(func);
            const doc = func.toString().match(/\/\*\*([\s\S]*?)\*\//)?.[1]?.trim() || "No documentation";
            toolDescriptions.push(`- ${name}${signature}: ${doc}`);
        }
        return toolDescriptions.join("\n");
    }

    getFunctionSignature(func) {
        const funcStr = func.toString();
        const match = funcStr.match(/\(([^)]*)\)/);
        if (match) {
            const params = match[1].split(',').map(p => p.trim()).filter(p => p);
            return `(${params.map(p => p.split('=')[0]).join(', ')})`;
        }
        return "()";
    }

    renderSystemPrompt(systemPromptTemplate) {
        const toolList = this.getToolList();
        const fileList = fs.readdirSync(this.projectDirectory)
            .map(f => path.resolve(this.projectDirectory, f))
            .join(", ");
        
        return systemPromptTemplate
            .replace("${operating_system}", this.getOperatingSystemName())
            .replace("${tool_list}", toolList)
            .replace("${file_list}", fileList);
    }

    static getApiKey() {
        dotenv.config();
        const apiKey = "ms-f92ac48b-d40a-4980-b051-c0dd2a158944"
        // const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            throw new Error("未找到 OPENROUTER_API_KEY 环境变量，请在 .env 文件中设置。");
        }
        return apiKey;
    }

    async callModel(messages) {
        console.log("\n\n正在请求模型，请稍等...");
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: messages,
        });
        const content = response.choices[0].message.content;
        messages.push({ role: "assistant", content: content });
        return content;
    }

    parseAction(codeStr) {
        const match = codeStr.match(/^(\w+)\((.*)\)$/s);
        if (!match) {
            throw new Error("Invalid function call syntax");
        }

        const funcName = match[1];
        const argsStr = match[2].trim();

        const args = [];
        let currentArg = "";
        let inString = false;
        let stringChar = null;
        let i = 0;
        let parenDepth = 0;
        
        while (i < argsStr.length) {
            const char = argsStr[i];
            
            if (!inString) {
                if (char === '"' || char === "'") {
                    inString = true;
                    stringChar = char;
                    currentArg += char;
                } else if (char === '(') {
                    parenDepth += 1;
                    currentArg += char;
                } else if (char === ')') {
                    parenDepth -= 1;
                    currentArg += char;
                } else if (char === ',' && parenDepth === 0) {
                    args.push(this.parseSingleArg(currentArg.trim()));
                    currentArg = "";
                } else {
                    currentArg += char;
                }
            } else {
                currentArg += char;
                if (char === stringChar && (i === 0 || argsStr[i-1] !== '\\')) {
                    inString = false;
                    stringChar = null;
                }
            }
            
            i += 1;
        }
        
        if (currentArg.trim()) {
            args.push(this.parseSingleArg(currentArg.trim()));
        }
        
        return [funcName, args];
    }
    
    parseSingleArg(argStr) {
        argStr = argStr.trim();
        
        if ((argStr.startsWith('"') && argStr.endsWith('"')) || 
            (argStr.startsWith("'") && argStr.endsWith("'"))) {
            let innerStr = argStr.slice(1, -1);
            innerStr = innerStr.replace(/\\"/g, '"').replace(/\\'/g, "'");
            innerStr = innerStr.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
            innerStr = innerStr.replace(/\\r/g, '\r').replace(/\\\\/g, '\\');
            return innerStr;
        }
        
        try {
            if (argStr === 'true') return true;
            if (argStr === 'false') return false;
            if (!isNaN(argStr)) return Number(argStr);
            return argStr;
        } catch (error) {
            return argStr;
        }
    }

    getOperatingSystemName() {
        const osMap = {
            "darwin": "macOS",
            "win32": "Windows",
            "linux": "Linux"
        };
        return osMap[process.platform] || "Unknown";
    }

    async getUserInput(prompt) {
        return new Promise((resolve) => {
            process.stdout.write(prompt);
            process.stdin.once('data', (data) => {
                resolve(data.toString().trim());
            });
        });
    }
}

// 工具函数
async function readFile(filePath) {
    /** 用于读取文件内容 */
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return content;
    } catch (error) {
        throw new Error(`读取文件失败: ${error.message}`);
    }
}

async function writeToFile(filePath, content) {
    /** 将指定内容写入指定文件 */
    try {
        await fs.promises.writeFile(filePath, content.replace(/\\n/g, '\n'), 'utf8');
        return "写入成功";
    } catch (error) {
        throw new Error(`写入文件失败: ${error.message}`);
    }
}

async function runTerminalCommand(command) {
    /** 用于执行终端命令 */
    try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr) {
            return `执行成功，但有警告: ${stderr}`;
        }
        return `执行成功: ${stdout}`;
    } catch (error) {
        return `执行失败: ${error.message}`;
    }
}

async function main() {
    const program = new Command();
    
    program
        .argument('<project_directory>', '项目目录路径')
        .action(async (projectDirectory) => {
            try {
                const projectDir = path.resolve(projectDirectory);
                
                if (!fs.existsSync(projectDir)) {
                    console.error(`错误: 目录 ${projectDir} 不存在`);
                    process.exit(1);
                }

                const tools = [readFile, writeToFile, runTerminalCommand];
                const agent = new ReActAgent(tools, "Qwen/Qwen3-Coder-480B-A35B-Instruct", projectDir);

                const task = await agent.getUserInput("请输入任务：");
                const finalAnswer = await agent.run(task);

                console.log(`\n\n✅ Final Answer：${finalAnswer}`);
            } catch (error) {
                console.error(`错误: ${error.message}`);
                process.exit(1);
            }
        });

    program.parse();
}

// if (import.meta.url === `file://${process.argv[1]}`) {
    main();
// }
