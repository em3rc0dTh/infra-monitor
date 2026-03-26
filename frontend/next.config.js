/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configura basePath para que Next.js funcione correctamente 
  // detrás de la ruta /monitor/ de tu Nginx.
  basePath: '/monitor',
  trailingSlash: false,
};

module.exports = nextConfig;
