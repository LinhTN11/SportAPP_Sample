const { PrismaClient } = require('@prisma/client');
const search_venues = require('./src/services/chatbot/actions/search_venues.action');
const prisma = new PrismaClient();

async function test_search() {
    console.log("--- Test Case 1: Search within 10km of Nghĩa Đô (Approx 21.048, 105.803) ---");
    const userLocation = { lat: 21.0482, lng: 105.8038 }; // Nghĩa Đô
    const result1 = await search_venues.execute({
        args: { sportType: 'football' },
        userLocation,
        prisma
    });
    console.log("Result 1 Search Method:", result1.meta.searchMethod);
    console.log("Result 1 Found:", result1.data.map(v => v.name));

    console.log("\n--- Test Case 2: Search in Hanoi without GPS (Text-based) ---");
    const result2 = await search_venues.execute({
        args: { sportType: 'football', city: 'Hà Nội' },
        userLocation: null,
        prisma
    });
    console.log("Result 2 Search Method:", result2.meta.searchMethod);
    console.log("Result 2 Found:", result2.data.map(v => v.name));

    console.log("\n--- Test Case 3: Search in non-existent area (Hallucination check) ---");
    const result3 = await search_venues.execute({
        args: { sportType: 'football', city: 'Sóc Trăng' },
        userLocation: null,
        prisma
    });
    console.log("Result 3 Search Method:", result3.meta.searchMethod);
    console.log("Result 3 Found:", result3.data.length);

    await prisma.$disconnect();
}

test_search().catch(e => {
    console.error(e);
    process.exit(1);
});
