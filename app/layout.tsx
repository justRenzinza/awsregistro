import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
	display: "swap",
});

export const metadata = {
	title: "AWSRegistro • Painel",
	description: "Sistema de controle e gestão AWSRegistro",
	icons: {
		icon: "/logo-branca.png", // caminho relativo à pasta /public
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="pt-BR" className={inter.variable}>
			<body className="font-sans antialiased bg-gray-50 text-gray-900">
				{children}
			</body>
		</html>
	);
}

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
};
