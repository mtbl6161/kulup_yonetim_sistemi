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

  const stepsToPrint = []
  for await (const line of rl) {
    if (line.trim()) {
      const step = JSON.parse(line)
      if (step.step_index >= 675 && step.step_index < 795) {
        if (step.source === 'MODEL' && step.type === 'PLANNER_RESPONSE' && step.content && step.content.trim()) {
          stepsToPrint.push(step)
        }
      }
    }
  }

  console.log(`Found ${stepsToPrint.length} planner response steps:`)
  for (const step of stepsToPrint) {
    console.log(`\n=== STEP ${step.step_index} ===`)
    console.log(step.content)
  }
}

run()
