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

  // Print steps between 670 and 879
  const rangeSteps = lines.filter(l => l.step_index >= 670 && l.step_index <= 880)
  for (const step of rangeSteps) {
    if (step.type === 'USER_INPUT' || step.type === 'PLANNER_RESPONSE') {
      console.log(`\n--- Step ${step.step_index} (${step.source} - ${step.type}) ---`)
      console.log(step.content)
    }
  }
}

run()
