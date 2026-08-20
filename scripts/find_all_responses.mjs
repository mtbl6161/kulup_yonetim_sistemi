import fs from 'fs'
import path from 'path'
import readline from 'readline'

const logPath = 'C:\\Users\\TUĞBA BAL\\.gemini\\antigravity\\brain\\2a277067-ceae-44a0-a61d-7e253d2ed54f\\.system_generated\\logs\\transcript.jsonl'

async function run() {
  const fileStream = fs.createReadStream(logPath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  for await (const line of rl) {
    if (line.trim()) {
      const step = JSON.parse(line)
      if (step.source === 'MODEL' && step.content && step.content.trim()) {
        console.log(`Step ${step.step_index} (${step.type}): ${step.content.substring(0, 100).replace(/\n/g, ' ')}...`)
      }
    }
  }
}

run()
