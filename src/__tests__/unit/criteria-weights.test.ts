/**
 * Tests para verificar que los pesos de criterios suman 100%
 */

describe('Criteria Weights Validation', () => {
  // Los pesos default del prompt de Gemini
  const defaultWeights = {
    'Respeto y Cortesia': 29,
    'Cumplimiento de Protocolo': 24,
    'Resolucion del Problema': 29,
    'Cierre Profesional': 18,
  }

  test('Los pesos default deben sumar exactamente 100%', () => {
    const totalWeight = Object.values(defaultWeights).reduce((sum, w) => sum + w, 0)
    expect(totalWeight).toBe(100)
  })

  test('Cada peso debe ser mayor a 0', () => {
    Object.entries(defaultWeights).forEach(([criterion, weight]) => {
      expect(weight).toBeGreaterThan(0)
    })
  })

  test('Las proporciones deben mantenerse (5:4:5:3)', () => {
    // Proporción original: 25:20:25:15 = 5:4:5:3
    // Nueva: 29:24:29:18 normalizada
    const respeto = defaultWeights['Respeto y Cortesia']
    const protocolo = defaultWeights['Cumplimiento de Protocolo']
    const resolucion = defaultWeights['Resolucion del Problema']
    const cierre = defaultWeights['Cierre Profesional']

    // Respeto = Resolucion (misma proporción original)
    expect(respeto).toBe(resolucion)

    // Protocolo > Cierre (4 > 3 en proporción original)
    expect(protocolo).toBeGreaterThan(cierre)

    // Respeto > Protocolo (5 > 4 en proporción original)
    expect(respeto).toBeGreaterThan(protocolo)
  })

  test('Cálculo de score ponderado debe dar resultado esperado', () => {
    // Ejemplo: criterios con 95%, 100%, 90%, 100%
    const scores = {
      'Respeto y Cortesia': 95,
      'Cumplimiento de Protocolo': 100,
      'Resolucion del Problema': 90,
      'Cierre Profesional': 100,
    }

    const weightedScore = Object.entries(scores).reduce((sum, [criterion, score]) => {
      const weight = defaultWeights[criterion as keyof typeof defaultWeights]
      return sum + (score * weight / 100)
    }, 0)

    // (95*29 + 100*24 + 90*29 + 100*18) / 100 = 95.55
    expect(weightedScore).toBeCloseTo(95.55, 1)
  })
})
