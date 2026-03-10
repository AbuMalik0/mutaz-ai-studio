export async function removeBackgroundAI(base64Image: string): Promise<string | null> {
  try {
    console.log("ALL ENV VARS:", import.meta.env);
    console.log("VITE_API_URL IS:", import.meta.env.VITE_API_URL);

    let API_BASE = import.meta.env.VITE_API_URL || '';
    if (API_BASE && API_BASE.endsWith('/')) {
      API_BASE = API_BASE.slice(0, -1);
    }

    console.log("Sending request to:", `${API_BASE}/api/remove-auto`);

    const response = await fetch(`${API_BASE}/api/remove-auto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("BG Removal API Error Status:", response.status, "Text:", errText);
      alert(`API Error: ${response.status} - ${errText.substring(0, 100)}`);
      return null;
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("BG Removal Network Error:", error);
    alert(`Network Error: Cannot reach AI Server. Check console for details.`);
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
