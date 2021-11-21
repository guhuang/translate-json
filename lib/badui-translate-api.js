const https = require('https')
const path = require('path')
const fs = require('fs')

const MD5 = require('md5.js')

const REQUEST_URL = 'https://fanyi-api.baidu.com/api/trans/vip/translate'
const APPID = '' // 百度翻译开发者中心 APP ID
const SECRET = '' // 百度翻译开发者中心密钥

function qs(url, data) {
    let q = ''
    Object.keys(data).forEach(key => {
        q += `${key}=${encodeURIComponent(data[key])}&`
    })
    return `${url}?${q}`
}

class Queue {
    constructor() {
        this.queue = []
        this.lastTime = 0
        this.f = 1200
        this.maxNum = 1
        this.curNum = 0
    }
    add(task) {
        this.queue.push(task)
        this.run()
    }
    async run() {
        const curTime = Date.now()
        if (!this.queue.length || this.curNum === this.maxNum) {
            return
        }
        const task = this.queue.shift()
        this.lastTime = curTime
        this.curNum++
        try {
            await task()
            this.complete()
        } catch(e) {
            this.complete()
        }
    }
    complete() {
        this.curNum--
        const remain = this.f - (Date.now() - this.lastTime)
        if (remain > 0) {
            setTimeout(this.run.bind(this), remain)
        } else {
            this.run()
        }
    }
}

function translate(
    q,
    from = 'zh',
    to = 'en',
    salt = Date.now()
) {
    const rawSign = APPID + q + salt + SECRET
    const sign = new MD5().update(rawSign).digest('hex')
    const data = {
        q,
        from,
        to,
        appid: APPID,
        salt,
        sign
    }
    const url = qs(REQUEST_URL, data)
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let result = ''
            res.on('data', d => {
                result += d
            })
            res.on('end', () => {
                result = JSON.parse(result)
                const { error_code, error_msg, trans_result } = result
                if (error_code) {
                    console.error(`翻译请求失败，错误码：${error_code}，错误信息：${error_msg}`)
                    reject()
                } else {
                    resolve(trans_result)
                }
            })
        }).on('error', e => {
            console.error('请求错误：', e)
            reject(e)
        })
    })
}

module.exports = function (file) {
    return new Promise((resolve, reject) => {
        const content = require(file)
        const translateResult = {}
        const queue = new Queue()
        const keys = Object.keys(content)
        keys.forEach((key, index) => {
            queue.add(async function () {
                const transRes = await translate(content[key])
                const res = transRes.reduce((accu, cur) => {
                    return accu + cur.dst
                }, '')
                translateResult[key] = res
                if (index === keys.length - 1) {
                    resolve(translateResult)
                }
            })
        })
    })
}
