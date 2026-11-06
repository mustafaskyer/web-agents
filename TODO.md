1. [x] Switch to a turbo repo and make this work under webmc-helpers as a package to demonstrate it via different examples (`@web-agents/*`, Phase 1)
2. add examples for ecommerce and booking flights web sites (designs from opendesign mcp)
3. add dev tools package (inspired from tanstack dev tools) that visualize and make runs with visual json schema to simplify how to run
4. add chat widget to enable and chat with the mcp leveraging agents
5. agents might be langchain agents, or a ONNX runtime agents that totally runs in the browser
6. add context provider for global tools, and enable tools per pages path, or from a specific component to be enableTools([...toolNames]) to register it in this component mount and unregister when it's unmounted automatically
7. make an api for new WebTool, and make it align and works with ServerTool (mastra already supports something like that!)
8. deploy to vercel!

issues:

1. [x] when a user interact (make cursor move or willing to take an action), an agent cursor should be hidden directly (`yieldToUser`, Phase 1)

priorites:
1.need to intensively invest in performance, animations, UI/UX perspective, and developer experience perspective

ecommerce store example -> https://demo.yournextstore.com/
booking flights example -> https://react-flights-ui.vercel.app/
