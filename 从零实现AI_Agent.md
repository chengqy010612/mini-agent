# 从零实现AI Agent：基于ReAct框架的智能代理系统

## 引言

AI Agent（智能代理）是人工智能领域的一个重要概念，它能够自主地感知环境、做出决策并执行行动。本文将带你从零开始实现一个基于ReAct（Reasoning and Acting）框架的AI Agent系统。

## 项目概述

我们将实现一个具有以下特性的AI Agent：
- **ReAct框架**：结合推理（Reasoning）和行动（Acting）的循环
- **工具调用**：支持文件操作、终端命令执行等
- **大模型集成**：使用OpenAI API进行自然语言处理
- **命令行界面**：提供友好的用户交互体验

## 技术栈

- **Node.js**：运行环境
- **OpenAI API**：大语言模型服务
- **Commander.js**：命令行参数解析
- **ES6 Modules**：模块化开发

## 第一步：项目初始化

### 1.1 创建项目目录
```bash
mkdir mini-agent
cd mini-agent
npm init -y
```

### 1.2 安装依赖
```bash
npm install openai dotenv commander
```

### 1.3 配置package.json
```json
{
  "name": "agent-js",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "start": "node agent.js ."
  },
  "dependencies": {
    "openai": "^4.20.1",
    "dotenv": "^16.3.1",
    "commander": "^11.1.0"
  }
}
```

## 第二步：核心Agent类设计

### 2.1 ReActAgent类结构
```javascript
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
}
```

### 2.2 核心运行循环
Agent的核心是ReAct循环：思考（Thought）→ 行动（Action）→ 观察（Observation）→ 思考...

```javascript
async run(userInput) {
    const messages = [
        { role: "system", content: this.renderSystemPrompt(react_system_prompt_template) },
        { role: "user", content: `<question>${userInput}</question>` }
    ];

    while (true) {
        const content = await this.callModel(messages);

        // 解析思考过程
        const thoughtMatch = content.match(/<thought>(.*?)<\/thought>/s);
        if (thoughtMatch) {
            console.log(`\n\n💭 Thought: ${thoughtMatch[1]}`);
        }

        // 检查是否到达最终答案
        if (content.includes("<final_answer>")) {
            const finalAnswer = content.match(/<final_answer>(.*?)<\/final_answer>/s);
            return finalAnswer[1];
        }

        // 解析行动
        const actionMatch = content.match(/<action>(.*?)<\/action>/s);
        if (!actionMatch) {
            throw new Error("模型未输出 <action>");
        }
        
        const action = actionMatch[1];
        const [toolName, args] = this.parseAction(action);

        console.log(`\n\n🔧 Action: ${toolName}(${args.join(', ')})`);
        
        // 执行工具调用
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
```

## 第三步：工具系统实现

### 3.1 基础工具函数
```javascript
// 文件读取工具
async function readFile(filePath) {
    /** 用于读取文件内容 */
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return content;
    } catch (error) {
        throw new Error(`读取文件失败: ${error.message}`);
    }
}

// 文件写入工具
async function writeToFile(filePath, content) {
    /** 将指定内容写入指定文件 */
    try {
        await fs.promises.writeFile(filePath, content.replace(/\\n/g, '\n'), 'utf8');
        return "写入成功";
    } catch (error) {
        throw new Error(`写入文件失败: ${error.message}`);
    }
}

// 终端命令执行工具
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
```

## 第四步：提示模板设计

### 4.1 系统提示模板
```javascript
export const react_system_prompt_template = `
你需要解决一个问题。为此，你需要将问题分解为多个步骤。对于每个步骤，首先使用 <thought> 思考要做什么，然后使用可用工具之一决定一个 <action>。接着，你将根据你的行动从环境/工具中收到一个 <observation>。持续这个思考和行动的过程，直到你有足够的信息来提供 <final_answer>。

所有步骤请严格使用以下 XML 标签格式输出：
- <question> 用户问题
- <thought> 思考
- <action> 采取的工具操作
- <observation> 工具或环境返回的结果
- <final_answer> 最终答案

请严格遵守：
- 你每次回答都必须包括两个标签，第一个是 <thought>，第二个是 <action> 或 <final_answer>
- 输出 <action> 后立即停止生成，等待真实的 <observation>
- 工具参数中的文件路径请使用绝对路径

本次任务可用工具：
\${tool_list}

环境信息：
操作系统：\${operating_system}
当前目录下文件列表：\${file_list}
`;
```

## 第五步：参数解析和工具调用

### 5.1 行动解析器
```javascript
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
```

## 第六步：命令行界面

### 6.1 主程序入口
```javascript
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
```

## 第七步：使用示例

### 7.1 启动Agent
```bash
npm start
```

### 7.2 任务示例
```
请输入任务：总结当前项目，并调用工具写入文档
```

### 7.3 执行过程
Agent会按照以下步骤执行：
1. **思考阶段**：分析任务需求
2. **行动阶段**：调用相应工具
3. **观察阶段**：获取工具执行结果
4. **循环执行**：直到完成任务

## 第八步：扩展和优化

### 8.1 添加新工具
```javascript
// 网络请求工具
async function fetchData(url) {
    /** 获取网络数据 */
    try {
        const response = await fetch(url);
        const data = await response.text();
        return data;
    } catch (error) {
        throw new Error(`网络请求失败: ${error.message}`);
    }
}
```

### 8.2 错误处理优化
```javascript
// 添加重试机制
async function callModelWithRetry(messages, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await this.callModel(messages);
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            console.log(`重试第 ${i + 1} 次...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}
```

## 总结

通过这个项目，我们实现了一个完整的AI Agent系统，具备以下特点：

1. **ReAct框架**：实现了思考-行动的循环机制
2. **工具系统**：支持多种工具的动态注册和调用
3. **大模型集成**：与OpenAI API无缝集成
4. **用户交互**：提供友好的命令行界面
5. **错误处理**：完善的异常处理机制
6. **可扩展性**：易于添加新工具和功能

这个实现为构建更复杂的AI Agent系统提供了坚实的基础，可以根据具体需求进行进一步的扩展和优化。

## 参考资料

- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Node.js Documentation](https://nodejs.org/docs)
