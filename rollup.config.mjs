import { nodeResolve } from "@rollup/plugin-node-resolve";
import { swc } from "rollup-plugin-swc3";
export default {
    input: "src/index.js",
    output: {
        file: "dist/index.js",
        format: "cjs",
        exports: "default"
    },
    plugins: [
        nodeResolve(),
        swc({
            jsc: {
                parser: { syntax: "ecmascript" },
                target: "es2022"
            }
        })
    ]
};
