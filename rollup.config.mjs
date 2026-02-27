import { nodeResolve } from "@rollup/plugin-node-resolve";
import { swc } from "rollup-plugin-swc3";

export default {
    input: "src/index.ts",
    output: {
        file: "dist/index.js",
        format: "es"
    },
    external: [
        "@metro/wrappers",
        "@metro/common",
    ],
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
