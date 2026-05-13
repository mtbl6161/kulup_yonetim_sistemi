import crypto from 'crypto'

export interface IyzicoConfig {
  apiKey: string
  secretKey: string
  baseUrl: string
}

export async function iyzicoRequest(
  config: IyzicoConfig,
  path: string,
  body: any
) {
  const randomString = Date.now().toString() + Math.random().toString(36).slice(2)
  const bodyString = JSON.stringify(body)
  
  // V2 Hashing Logic
  // signature = hmac_sha256(secretKey, randomString + path + bodyString)
  const signature = crypto
    .createHmac('sha256', config.secretKey)
    .update(randomString + path + bodyString)
    .digest('hex')

  const authParams = [
    `apiKey:${config.apiKey}`,
    `randomKey:${randomString}`,
    `signature:${signature}`
  ]
  const authorization = 'IYZWSv2 ' + Buffer.from(authParams.join('&')).toString('base64')

  const response = await fetch(config.baseUrl + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authorization,
      'x-iyzi-rnd': randomString,
      'x-iyzi-client-version': 'klup360-fetch-1.0'
    },
    body: bodyString
  })

  return await response.json()
}

// 3D Secure Initialize için özel yardımcı
export async function iyzicoInitialize3DS(config: IyzicoConfig, params: any) {
  return await iyzicoRequest(config, '/payment/3dsecure/initialize', params)
}

// 3D Secure Ödeme Onay (Auth) için özel yardımcı
export async function iyzicoAuth3DS(config: IyzicoConfig, params: any) {
  return await iyzicoRequest(config, '/payment/3dsecure/auth', params)
}
