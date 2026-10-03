# AI Usage

## Tool used

GitHub Copilot was used during implementation.

## Role

Copilot helped scaffold the two-app TypeScript structure, implement the SQLite repository and evaluator, shape the Fastify API and error handling, build the React form and result states, write focused positive and negative tests, and draft project documentation.

## Review and testing

I reviewed the generated code, adjusted implementation details, and ran the backend and frontend test suites and production builds. I reviewed the behavior against the assignment requirements, including validation, time-window boundaries, empty audiences, retries, and accessibility-oriented controls.

## My notes

I used Claude as a thinking partner for this assignment: to clarify the requirements, plan the implementation, sketch the high-level design, and sanity-check choices such as using SQLite with a seed script for synthetic data. I wrote and reviewed the code myself, and I made the final decisions on the architecture, the rule-to-SQL approach, and the API shape. The main lesson was that AI is most useful for breaking down the problem and checking edge cases, but I still had to verify everything by running and testing it myself.