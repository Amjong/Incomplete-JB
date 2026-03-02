export interface ProbedImage {
  width: number
  height: number
}

export function probeImage(url: string): Promise<ProbedImage> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    if (!url.startsWith('data:')) {
      image.crossOrigin = 'anonymous'
    }

    image.onload = () => {
      const width = image.naturalWidth || image.width
      const height = image.naturalHeight || image.height

      if (!width || !height) {
        reject(new Error('Image has invalid dimensions.'))
        return
      }

      resolve({ width, height })
    }

    image.onerror = () => {
      reject(new Error('Failed to load image URL.'))
    }

    image.src = url
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to read file.'))
        return
      }
      resolve(reader.result)
    }
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.readAsDataURL(file)
  })
}
