/** @type {import('next').NextConfig} */

const nextConfig = {
	turbopack: {},
	serverExternalPackages: [
		'firebase-admin',
		'@google-cloud/firestore',
		'@google-cloud/storage',
		'google-auth-library',
		'gtoken',
		'gaxios',
	],
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	allowedDevOrigins: ["*.theopenbuilder.com"],
	webpack: (config, { isServer }) => {
		if (!isServer) {
			// Prevent firebase-admin from being bundled on the client side
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
				child_process: false,
				http2: false,
				dns: false,
			};
		}
		return config;
	},
};

export default nextConfig;
