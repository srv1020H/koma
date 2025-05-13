export default {
  async fetch(request, env, ctx) {
    const { VIDEOS } = env;
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = url.origin;

    if (path === "/panel") {
      const auth = url.searchParams.get("auth");
      if (auth !== "VjshsjGs1") {
        return new Response("Unauthorized. Add ?auth=VjshsjGs1", { status: 401 });
      }

      if (request.method === "POST") {
        const formData = await request.formData();
        const action = formData.get("action");

        if (action === "upload") {
          const file = formData.get("file");
          if (!file || !file.name.endsWith(".mp4")) {
            return new Response("Only .mp4 files allowed", { status: 400 });
          }

          const arrayBuffer = await file.arrayBuffer();
          const id = Date.now().toString();
          await VIDEOS.put(id, arrayBuffer);

        } else if (action === "delete") {
          const id = formData.get("id");
          await VIDEOS.delete(id);
        }

        return Response.redirect(`${origin}/panel?auth=${auth}`, 303);
      }

      const list = await VIDEOS.list();
      const videos = list.keys.sort((a, b) => b.name - a.name);
      let items = "";
      for (const video of videos) {
        items += `
          <div style="margin:10px 0;background:#222;padding:10px;border-radius:5px;">
            <video src="/video/${video.name}" controls style="width:100%;max-width:300px;"></video><br>
            <form method="POST">
              <input type="hidden" name="id" value="${video.name}">
              <input type="hidden" name="action" value="delete">
              <button style="background:red;color:#fff;margin-top:5px;">Delete</button>
            </form>
          </div>
        `;
      }

      return new Response(`
        <html>
          <head>
            <title>Upload Panel</title>
            <style>
              body { background:#111; color:#fff; font-family:sans-serif; text-align:center; padding:20px; }
              input, button { padding:10px; margin:10px; font-size:1rem; }
              button { background:#0f0; color:#000; border:none; cursor:pointer; }
            </style>
          </head>
          <body>
            <h1>Video Upload Panel</h1>
            <form method="POST" enctype="multipart/form-data">
              <input type="hidden" name="action" value="upload">
              <input type="file" name="file" accept="video/mp4" required /><br>
              <button type="submit">Upload MP4</button>
            </form>
            <hr>
            <h2>Uploaded Videos</h2>
            ${items}
          </body>
        </html>
      `, { headers: { "Content-Type": "text/html" } });
    }

    if (path === "/") {
      const list = await VIDEOS.list();
      const videos = list.keys.sort((a, b) => b.name - a.name);
      let videoTags = "";
      for (const video of videos) {
        videoTags += `<div class="video-wrapper"><video controls muted playsinline src="/video/${video.name}"></video></div>`;
      }

      return new Response(`
        <html>
          <head>
            <title>Video Feed</title>
            <style>
              body { margin: 0; background: #000; color: #fff; font-family: sans-serif; overflow-x: hidden; }
              .video-wrapper { width: 100vw; height: 100vh; overflow: hidden; }
              video { width: 100%; height: 100%; object-fit: cover; display: block; }
            </style>
          </head>
          <body>
            ${videoTags}
          </body>
        </html>
      `, { headers: { "Content-Type": "text/html" } });
    }

    if (path.startsWith("/video/")) {
      const id = path.split("/video/")[1];
      const data = await VIDEOS.get(id, { type: "arrayBuffer" });

      if (!data) return new Response("Not found", { status: 404 });

      return new Response(data, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `inline; filename="${id}.mp4"`,
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};