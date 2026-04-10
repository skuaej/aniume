const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_URL = 'http://localhost:5000';
const SECRET = process.env.JWT_SECRET || 'streaming_key_778899';

// Create a fake admin token
const token = jwt.sign({ username: 'suma123', role: 'admin' }, SECRET, { expiresIn: '1h' });
const headers = { Authorization: `Bearer ${token}` };

async function testRoutes() {
    try {
        console.log('Testing Top 5 POST...');
        const t5Res = await axios.post(`${API_URL}/api/admin/top5`, {
            image: 'https://i.ibb.co/j0zNLs3/473-Wx593-H-465085773-peach-MODEL2.jpg',
            link: '/anime/test',
            title: 'Test Top 5'
        }, { headers });
        console.log('Top 5 POST success:', t5Res.data._id);

        console.log('\nTesting Episode PUT...');
        // We need an anime and episode ID. Let's find one.
        const animeRes = await axios.get(`${API_URL}/api/search?q=hh`);
        if (animeRes.data.length > 0) {
            const anime = animeRes.data[0];
            if (anime.episodes.length > 0) {
                const ep = anime.episodes[0];
                const epRes = await axios.put(`${API_URL}/api/admin/anime/${anime._id}/episode/${ep._id}`, {
                    title: 'Updated hh Episode Title'
                }, { headers });
                console.log('Episode PUT success:', epRes.data.success);
            } else {
                console.log('No episodes found for hh');
            }
        } else {
            console.log('No anime found for hh');
        }

    } catch (err) {
        console.error('Test failed!');
        console.error('Status:', err.response?.status);
        console.error('Data:', err.response?.data);
    }
}

testRoutes();
