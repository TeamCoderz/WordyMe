/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export const renderScore = async (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsBinaryString(file);
    reader.onload = async (event) => {
      try {
        const musicXml = event.target?.result as string;
        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
        const figure = document.createElement('figure');
        figure.style.visibility = 'hidden';
        document.body.appendChild(figure);
        const osmd = new OpenSheetMusicDisplay(figure, {
          autoResize: false,
          pageBackgroundColor: 'white',
        });
        await osmd.load(musicXml);
        osmd.render();
        const svg = figure.querySelector('svg')!;
        const serialized = new XMLSerializer().serializeToString(svg);
        const dataUrl = 'data:image/svg+xml,' + encodeURIComponent(serialized);
        document.body.removeChild(figure);
        resolve(dataUrl);
      } catch (error) {
        console.error('Error rendering score:', error);
        reject(new Error('Rendering score failed'));
      }
    };
  });
