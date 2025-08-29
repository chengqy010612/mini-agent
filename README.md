## 启动方式
通过命令行运行 `npm start` 或 `node agent.js .` 启动 Agent。



## 效果演示

```js
PS D:\code\ai agent\hello world2> npm start

> agent-js@0.1.0 start
> node agent.js .

请输入任务：总结当前项目，并调用工具写入文档

//第一次请求  
正在请求模型，请稍等...


💭 Thought: 我需要先了解当前项目的结构和内容。通过查看文件列表，我看到有 `agent.js` 和 `prompt_template.js` 等文件。为了总结项目，我应该先读取这些关键文件的内容，分析其功能和作用。然后将总结写入一个文档中。


🔧 Action: readFile(D:\code\ai agent\hello world2\agent.js)


🔍 Observation：import fs from 'fs';
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
        
............此处省略代码




//第二次请求  
正在请求模型，请稍等...


💭 Thought: 我已经读取了 `agent.js` 的内容，这是一个基于 ReAct 框架的 AI Agent 实现，支持工具调用如读取文件、写入文件和执行终端命令。接下来我需要 读取 `prompt_template.js` 来了解系统提示模板的内容，以便更全面地总结项目。


🔧 Action: readFile(D:\code\ai agent\hello world2\prompt_template.js)


🔍 Observation：export const react_system_prompt_template = 
你需要解决一个问题。为此，你需要将问题分解为多个步骤。对于每个步骤，首先使用 <thought> 思考要做什么，然后

............此处省略代码

            
            
            
//第三次请求            
正在请求模型，请稍等...


💭 Thought: 现在我已经了解了项目的主要组成部分：`agent.js` 是核心实现，`prompt_template.js` 定义了系统提示模板。接下来我需要查看 `package.json` 来了解项目的依赖和配置信息，这有助于更完整地总结项目。


🔧 Action: readFile(D:\code\ai agent\hello world2\package.json)


🔍 Observation：{
  "name": "agent-js",
  "version": "0.1.0",
  "description": "JavaScript version of Agent concepts, principles and construction patterns",
  "main": "agent.js",
  "type": "module",
  "scripts": {
    "start": "node agent.js .",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["agent", "ai", "react", "reasoning"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "openai": "^4.20.1",
    "dotenv": "^16.3.1",
    "commander": "^11.1.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}


//第四次请求   
正在请求模型，请稍等...


💭 Thought: 通过阅读 `package.json`，我了解到这是一个基于 Node.js 的 AI Agent 项目，使用了 `openai`、`dotenv` 和 `commander` 等依赖库。项目支持通 过命令行启动，入口文件是 `agent.js`。现在我已经收集了足够的信息来总结项目。接下来我将把项目总结写入一个文档文件中。


🔧 Action: writeToFile(D:\code\ai agent\hello world2\project_summary.md, # 项目总结\
\
## 项目概述\
这是一个基于 ReAct 框架的 AI Agent 实现，使用 JavaScript 编写。Agent 能够通过思考和行动的循环来解决用户提出的问题，支持调用多种工具如读取文件、写 入文件和执行终端命令。\
\
## 核心组件\
- **agent.js**: 核心实现文件，包含 ReActAgent 类和工具函数。\
- **prompt_template.js**: 定义了系统提示模板，指导 Agent 的行为模式。\
- **package.json**: 项目配置文件，定义了依赖和启动脚本。\
\
## 主要依赖\
- openai: 用于与大模型交互\
- dotenv: 用于加载环境变量\
- commander: 用于处理命令行参数\
\
## 启动方式\
通过命令行运行 `npm start` 或 `node agent.js .` 启动 Agent。)


🔍 Observation：写入成功

//第五次请求 
正在请求模型，请稍等...


💭 Thought: 我已经成功将项目总结写入了 `project_summary.md` 文件中。这个总结涵盖了项目概述、核心组件、主要依赖和启动方式。现在我可以提供最终答案了。


✅ Final Answer：项目总结如下：

## 项目概述
这是一个基于 ReAct 框架的 AI Agent 实现，使用 JavaScript 编写。Agent 能够通过思考和行动的循环来解决用户提出的问题，支持调用多种工具如读取文件、写 入文件和执行终端命令。

## 核心组件
- **agent.js**: 核心实现文件，包含 ReActAgent 类和工具函数。
- **prompt_template.js**: 定义了系统提示模板，指导 Agent 的行为模式。
- **package.json**: 项目配置文件，定义了依赖和启动脚本。

## 主要依赖
- openai: 用于与大模型交互
- dotenv: 用于加载环境变量
- commander: 用于处理命令行参数

## 启动方式
通过命令行运行 `npm start` 或 `node agent.js .` 启动 Agent。

总结文档已保存到 project_summary.md 文件中。
```

