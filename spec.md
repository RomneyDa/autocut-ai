AutoCut.AI is a simple video editing SASS app with AI features.

It offers one simple product: take in a video, use AI to analyze the video and output recommended cuts/deletions for the video

For example, content creators might record a longer video with a lot of ums, buts, silent things, etc. After processing, the user would see a preview UI with the ums and buts cut out, where they can adjust the cut boundaries and then pay e.g. $1.00 with stripe to download the video.

The architecture is as follows:
- There is a framerate parameter, adjustable in the future but set to 10/sec for now (every 0.1 seconds)
- Use ffmpeg to produce images at each frame
- Use ffmpeg to extract the full audio of the video
- Use the Gemini 2.5 Pro model through the gemini API to produce a detailed description of the video based on the sequence of images. Prompt it with all the images as well as their exact timestamps. Docs are here: https://ai.google.dev/api
- Use assembly AI to obtain an audio transcript with detailed timestamps at the same framerate. Docs are here https://www.assemblyai.com/docs/api-reference/overview
- It is critical that timestamps are preserved and matched through the entire process.

For the SASS user experience, the user can upload through a dialog or drag and drop a video in the UI (use a package for this if available), it will parse using ffmpeg on the client, THEN hit the server to make the requests to assembly and gemini. The user can pass an additional prompt to guide the model (simple UI input), which is injected into the request. Then, they get the detailed description with timestamps in a nice UI