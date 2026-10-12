/** @type {import('next').NextConfig} */
const nextConfig = {
  // ไม่เปิด cacheComponents: มันเก็บหน้าเก่าไว้ด้วย <Activity> แทนการ unmount
  // ทำให้ Leaflet เพิ่ม layer ลงแผนที่ที่ถูกทำลายไปแล้ว (appendChild of undefined)
  turbopack: {
    // มี package-lock.json ที่โฟลเดอร์แม่ด้วย ระบุ root ให้ชัด
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
