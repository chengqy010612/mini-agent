# 项目总结\
\
## 项目概述\
这是一个基于 ReAct 框架的 AI Agent 实现，使用 JavaScript 编写。Agent 能够通过思考和行动的循环来解决用户提出的问题，支持调用多种工具如读取文件、写入文件和执行终端命令。\
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
通过命令行运行 `npm start` 或 `node agent.js .` 启动 Agent。