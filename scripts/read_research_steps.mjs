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

  const steps = []
  for await (const line of rl) {
    if (line.trim()) {
      const step = JSON.parse(line)
      if (step.step_index >= 675 && step.step_index < 790) {
        steps.push(step)
      }
    }
  }

  // Filter tool calls and run command outputs
  for (const step of steps) {
    if (step.tool_calls) {
      console.log(`\n=== STEP ${step.step_index} Tool Calls ===`)
      console.log(JSON.stringify(step.tool_calls, null, 2))
    }
    if (step.type === 'RUN_COMMAND' && step.content) {
      console.log(`\n=== STEP ${step.step_index} Command Result ===`)
      console.log(step.content)
    }
  }
}

run()
