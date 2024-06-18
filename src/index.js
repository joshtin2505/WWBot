import { chromium } from "playwright"
import path from "path"
import fs from "fs"
import util from "util"

// Ruta donde se guardará el estado de la sesión
const SESSION_FILE_PATH = "./whatsapp-session.json"

// Función para guardar el estado del contexto
async function saveContextState(context) {
  const state = await context.storageState()
  await fs.writeFile(SESSION_FILE_PATH, JSON.stringify(state), (err) => {
    if (err) {
      console.error(err)
    }
  })
}

// Función para cargar el estado del contexto
async function loadContextState(browser) {
  try {
    const file = await util.promisify(fs.readFile)(SESSION_FILE_PATH, "utf-8")
    const state = JSON.parse(file)
    return await browser.newContext({ storageState: state })
  } catch (err) {
    console.log("No se encontró el archivo de sesión" + err)
    // Si el archivo no existe, se crea un nuevo contexto sin estado previo
    return await browser.newContext()
  }
}

async function loadWebWhatsApp() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  // const context = await loadContextState(browser)
  const page = await context.newPage()

  await page.goto("https://web.whatsapp.com")

  await page.waitForSelector('canvas[aria-label="Scan me!"]', {
    state: "hidden",
  })

  // await page.waitForSelector("#pane-side", { timeout: 60000 })
  // await saveContextState(context)
  // await browser.close()

  return { browser, context, page }
}

async function sendMessagesWithImage({ phoneNumbers, message, imagePath }) {
  try {
    const browser = await chromium.launch({ headless: false }) // Abre el navegador en modo no-cabeza para que puedas ver el proceso

    const context = await browser.newContext()
    // const context = await loadContextState(browser)
    const page = await context.newPage()

    await page.goto("https://web.whatsapp.com")

    await page.waitForSelector('canvas[aria-label="Scan me!"]', {
      state: "hidden",
    })

    await page.waitForSelector("#pane-side", { timeout: 60000 })
    // await saveContextState(context)

    // const { browser, context, page } = await loadWebWhatsApp()

    for (const phoneNumber of phoneNumbers) {
      let numberLink = `https://web.whatsapp.com/send?phone=${phoneNumber}`
      // await page.goto(numberLink)
      await page.evaluate((url) => {
        window.history.pushState({}, "", url)
      }, numberLink)
      await page.waitForSelector("#main", { timeout: 60000 })

      if (imagePath) {
        const attachButton = await page.$('#main div[title="Adjuntar"]')
        if (attachButton) {
          await attachButton.click()
        } else {
          throw new Error("No se encontró el botón de adjuntar")
        }

        const fileInput = await page.$(
          'input[accept="image/*,video/mp4,video/3gpp,video/quicktime"]'
        )
        if (fileInput) {
          const absoluteImagePath = path.resolve(imagePath)

          await fileInput.setInputFiles(absoluteImagePath)

          await page.waitForSelector('div[aria-label="Enviar"]')
          const sendImageButton = await page.$('div[aria-label="Enviar"]')
          if (sendImageButton) {
            if (message) {
              const textarea = await page.$(`div[contenteditable="true"]`)
              if (!textarea)
                throw new Error("No se encontró el campo de texto del chat")

              await textarea.focus()
              await page.keyboard.type(message).then(async () => {
                await sendImageButton.click()
              })
            }
          } else {
            throw new Error("No se encontró el botón de enviar la imagen")
          }
        } else {
          throw new Error("No se encontró el input de archivo")
        }

        await page.waitForTimeout(2000)
      }
    }

    // await browser.close()
  } catch (error) {
    console.log(error)
  }
}
async function sendMessages({ phoneNumbers, message }) {
  try {
    const browser = await chromium.launch({ headless: false })
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto("https://web.whatsapp.com")

    await page.waitForSelector('canvas[aria-label="Scan me!"]', {
      state: "hidden",
    })

    await page.waitForSelector("#pane-side", { timeout: 60000 })

    for (const phoneNumber of phoneNumbers) {
      let numberLink = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(
        message
      )}`
      await page.goto(numberLink)

      await page.waitForSelector("#main", { timeout: 60000 })

      const main = await page.$("#main")
      if (!main) throw new Error("No hay chat abierto")

      const textarea = await main.$(`div[contenteditable="true"]`)
      if (!textarea)
        throw new Error("No se encontró el campo de texto del chat")

      await textarea.focus()
      await page.keyboard.type(message)

      await page.waitForSelector(`[data-testid="send"], [data-icon="send"]`)
      const sendButton = await main.$(
        `[data-testid="send"], [data-icon="send"]`
      )
      if (sendButton) {
        await sendButton.click()
      } else {
        throw new Error("No se encontró el botón de enviar")
      }
      await page.waitForTimeout(2000)
    }
    await browser.close()
  } catch (error) {
    console.log(error)
  }
}

sendMessagesWithImage({
  phoneNumbers: ["573185003169", "573185003169"],
  message:
    "Hola, ¿cómo estás? Esto es una prueba de un mensaje enviado desde un script de Node.js",
  imagePath: "public/img.png",
})
