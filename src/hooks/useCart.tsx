import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
	children: ReactNode;
}

interface UpdateProductAmount {
	productId: number;
	amount: number;
}

interface CartContextData {
	cart: Product[];
	addProduct: (productId: number) => Promise<void>;
	removeProduct: (productId: number) => void;
	updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
	const [cart, setCart] = useState<Product[]>(() => {
		const storagedCart = localStorage.getItem("@RocketShoes:cart");

		if (storagedCart) {
			return JSON.parse(storagedCart);
		}

		return [];
	});

	const updateCartAndLocalStorage = (newCart: Product[]) => {
		setCart(newCart);
		localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
	};

	const addProduct = async (productId: number) => {
		try {
			const productExists = cart.find((product) => product.id === productId);

			if (productExists) {
				updateProductAmount({ productId, amount: productExists.amount + 1 });
				return;
			}

			const { data: productData } = await api.get(`products/${productId}`);

			const newCart = [...cart, { ...productData, amount: 1 }];

			updateCartAndLocalStorage(newCart);
		} catch {
			toast.error("Erro na adição do produto");
		}
	};

	const removeProduct = (productId: number) => {
		try {
			const productIndex = cart.findIndex(
				(product) => product.id === productId
			);

			if (productIndex === -1) {
				throw new Error();
			}

			const newCart = cart.filter((product) => product.id !== productId);

			updateCartAndLocalStorage(newCart);
		} catch {
			toast.error("Erro na remoção do produto");
		}
	};

	const updateProductAmount = async ({
		productId,
		amount,
	}: UpdateProductAmount) => {
		try {
			if (amount < 1) {
				return;
			}

			const { data: productStock } = await api.get(`stock/${productId}`);

			if (amount > productStock.amount) {
				toast.error("Quantidade solicitada fora de estoque");
				return;
			}

			const newCart = cart.map((product) => {
				if (product.id === productId) {
					return { ...product, amount };
				}

				return product;
			});

			updateCartAndLocalStorage(newCart);
		} catch {
			toast.error("Erro na alteração de quantidade do produto");
		}
	};

	return (
		<CartContext.Provider
			value={{ cart, addProduct, removeProduct, updateProductAmount }}
		>
			{children}
		</CartContext.Provider>
	);
}

export function useCart(): CartContextData {
	const context = useContext(CartContext);

	return context;
}
