const { client } = require('./telegram');
const Anime = require('./models/Anime');
const { Api } = require('telegram');
const mongoose = require('mongoose');

// VJ-Video-Player style streaming: math-aligned offsets, continuous chunk fetching
// Based on: https://github.com/VJBots/VJ-Video-Player/blob/main/TechVJ/util/custom_dl.py
// Key fix: each iteration MUST send a new GetFile request with the updated offset
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

async function* yieldFile(document, offset, firstPartCut, lastPartCut, partCount) {
    let currentPart = 1;
    let currentOffset = offset; // track offset separately so we advance it per-chunk

    const location = new Api.InputDocumentFileLocation({
        id: document.id,
        accessHash: document.accessHash,
        fileReference: document.fileReference,
        thumbSize: '',
    });

    while (currentPart <= partCount) {
        // CRITICAL FIX: send a NEW GetFile request on every iteration (not just the first)
        let result;
        try {
            result = await client.invoke(
                new Api.upload.GetFile({
                    location,
                    offset: BigInt(currentOffset), // GramJS 2.x expects BigInt for offset
                    limit: CHUNK_SIZE,
                    precise: true,
                })
            );
        } catch (e) {
            console.error(`GetFile error at offset ${currentOffset}:`, e.message);
            break;
        }

        if (!result || !result.bytes || result.bytes.length === 0) {
            console.log(`Empty chunk at part ${currentPart}/${partCount}, stopping.`);
            break;
        }

        const chunk = result.bytes;

        if (partCount === 1) {
            // Only one chunk: trim both start and end
            yield chunk.slice(firstPartCut, lastPartCut);
        } else if (currentPart === 1) {
            // First chunk: trim the start
            yield chunk.slice(firstPartCut);
        } else if (currentPart === partCount) {
            // Last chunk: trim the end
            yield chunk.slice(0, lastPartCut);
        } else {
            yield chunk;
        }

        currentPart++;
        currentOffset += CHUNK_SIZE; // advance offset for next request
    }
}

const streamFile = async (req, res, episode_id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(episode_id)) {
        return res.status(400).send('Invalid Episode ID format.');
    }

    const anime = await Anime.findOne({ 'episodes._id': episode_id }, { 'episodes.$': 1 });
    if (!anime || !anime.episodes[0]) {
        return res.status(404).send('Episode not found');
    }

    const episode = anime.episodes[0];
    const { chat_id, message_id } = episode;

    if (!chat_id || !message_id) {
        return res.status(400).send('Episode not indexed with MTProto metadata. Please re-index.');
    }

    // Ensure GramJS client is connected
    if (!client.connected) {
        console.log('GramJS client not connected, waiting...');
        try {
            await client.connect();
        } catch (connErr) {
            console.error('Reconnect failed:', connErr.message);
            return res.status(503).send('Streaming service temporarily unavailable. Reconnecting...');
        }
    }

    // Fetch the message from Telegram to get the document
    let messages;
    try {
        messages = await client.getMessages(chat_id, { ids: [parseInt(message_id)] });
    } catch (fetchErr) {
        console.error('Failed to fetch message:', fetchErr.message);
        return res.status(502).send('Failed to fetch media info from Telegram: ' + fetchErr.message);
    }

    if (!messages || messages.length === 0 || !messages[0]) {
        return res.status(404).send('Message not found on Telegram');
    }

    const msg = messages[0];
    if (!msg.media) {
        return res.status(404).send('No media in message');
    }

    const document = msg.media.document;
    if (!document) return res.status(404).send('No document found in message');

    const fileSize = Number(document.size);
    let mimeType = document.mimeType || 'video/mp4';

    // Map MKV to webm for browser compatibility
    if (mimeType === 'video/x-matroska') {
        mimeType = 'video/webm';
    }

    const rangeHeader = req.headers.range;

    // Parse Range header exactly like VJ-Video-Player does
    let fromBytes, untilBytes;
    if (rangeHeader) {
        const parts = rangeHeader.replace('bytes=', '').split('-');
        fromBytes = parseInt(parts[0], 10) || 0;
        untilBytes = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    } else {
        fromBytes = 0;
        untilBytes = fileSize - 1;
    }

    // Clamp values
    fromBytes = Math.max(0, fromBytes);
    untilBytes = Math.min(untilBytes, fileSize - 1);

    if (isNaN(fromBytes) || isNaN(untilBytes) || untilBytes < fromBytes) {
        return res.status(416).set('Content-Range', `bytes */${fileSize}`).send('Range Not Satisfiable');
    }

    const reqLength = untilBytes - fromBytes + 1;

    // VJ-style math for aligned offset and part trimming
    const offset = fromBytes - (fromBytes % CHUNK_SIZE);
    const firstPartCut = fromBytes - offset;
    const lastPartCut = (untilBytes % CHUNK_SIZE) + 1;
    const partCount = Math.ceil((untilBytes + 1) / CHUNK_SIZE) - Math.floor(offset / CHUNK_SIZE);

    console.log(`[STREAM] ${episode.title} | bytes ${fromBytes}-${untilBytes}/${fileSize} | parts=${partCount} offset=${offset} firstCut=${firstPartCut} lastCut=${lastPartCut}`);

    const statusCode = rangeHeader ? 206 : 200;

    res.writeHead(statusCode, {
        'Content-Type': mimeType,
        'Content-Range': `bytes ${fromBytes}-${untilBytes}/${fileSize}`,
        'Content-Length': reqLength,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
    });

    for await (const chunk of yieldFile(document, offset, firstPartCut, lastPartCut, partCount)) {
        if (res.writableEnded || req.aborted) break;
        // Backpressure handling: if buffer full, wait for drain
        const canContinue = res.write(chunk);
        if (!canContinue) {
            await new Promise((resolve) => res.once('drain', resolve));
        }
    }

    if (!res.writableEnded) res.end();

  } catch (err) {
    console.error('Streaming error:', err.message, err.stack);
    if (!res.headersSent) {
        res.status(500).send('Streaming error: ' + err.message);
    } else if (!res.writableEnded) {
        res.end();
    }
  }
};

module.exports = { streamFile };
