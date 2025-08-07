const axios = require('axios');
const { dot, norm } = require('mathjs');

// 텍스트를 임베딩 벡터로 변환
const getEmbedding = async (text) => {
    const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
            input: text,
            model: 'text-embedding-3-small'
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
        }
    );
    return response.data.data[0].embedding;
};

// 두 벡터 간 유사도 계산
const cosineSimilarity = (vec1, vec2) => {
    return dot(vec1, vec2) / (norm(vec1) * norm(vec2));
};

module.exports = { getEmbedding, cosineSimilarity };
