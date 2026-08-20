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

  const lines = []
  for await (const line of rl) {
    if (line.trim()) {
      lines.push(JSON.parse(line))
    }
  }

  // Print steps between 675 and 795
  const rangeSteps = lines.filter(l => l.step_index >= 675 && l.step_index <= 795)
  for (const step of rangeSteps) {
    console.log(`\n--- Step ${step.step_index} (${step.source} - ${step.type} - status: ${step.status}) ---`)
    if (step.content) {
      console.log(step.content.substring(0, 1500))
    }
  }
}

run()
