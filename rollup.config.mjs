import { nodeResolve } from "@rollup/plugin-node-resolve";
import { swc } from "rollup-plugin-swc3";

export default {
    input: "src/index.ts",
    output: {
        file: "dist/index.js",
        format: "iife",
        // No name = outputs as (function(){...}()) which is a valid expression
        // This is required because Kettu evals plugins as: vendetta=>{return ${plugin.js}}
        // ES format breaks because export/import are invalid in function bodies
    },
    plugins: [
        nodeResolve(),
        swc({
            jsc: {
                parser: { syntax: "typescript" },
                target: "es2022"
            }
        })
    ]
};
