export async function removeBackgroundAI(base64Image: string): Promise<string | null> {
  try {
    const API_BASE = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${API_BASE}/api/remove-auto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      console.error("Local BG Removal Error:", response.statusText);
      return null;
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("Local BG Removal Error:", error);
    return null;
  }
}

export async function removeBackgroundManual(
  base64Image: string,
  colors: { r: number, g: number, b: number }[],
  tolerance: number
): Promise<string | null> {
  try {
    const hexColors = colors.map(c =>
      `#${c.r.toString(16).padStart(2, '0')}${c.g.toString(16).padStart(2, '0')}${c.b.toString(16).padStart(2, '0')}`
    );

    const API_BASE = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${API_BASE}/api/remove-manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image, colors: hexColors, tolerance }),
    });

    if (!response.ok) {
      console.error("Local Manual BG Removal Error:", response.statusText);
      return null;
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("Local Manual BG Removal Error:", error);
    return null;
  }
}
