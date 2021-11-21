const path = require('path')
const fs = require('fs')

const translate = require('./badui-translate-api')

const [, , filePath, targetPath] = process.argv
if (!filePath || !targetPath) {
    throw new Error('please pass current file path or generate path')
}
const sourcePath = path.resolve(process.cwd(), filePath)
translate(sourcePath).then(res => {
    try {
        fs.writeFileSync(targetPath, JSON.stringify(res, null, 2))
    } catch (e) {
        console.error(e)
    }
})