import { createContext, ReactNode, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
const STORAGE_KEY = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
	const firstRender = useRef(true);
	const [cart, setCart] = useState<Product[]>(() => {
		const storageCart = localStorage.getItem(STORAGE_KEY);
		return storageCart ? JSON.parse(storageCart) : [];
	});

	useEffect(() => {
		if (firstRender.current) {
      firstRender.current = false;
      return;
    }

		localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
	}, [cart])

	const updateProductAmount = async ({
		productId,
		amount,
	}: UpdateProductAmount) => {
		try {
			if (amount < 1) {
				toast.error('Erro na alteração de quantidade do produto');
				return;
			}

			const updatedCart = [...cart];
			const existingProduct = updatedCart.find(product => product.id === productId);
			const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

			if (!existingProduct) return;

			if (amount > stock.amount) {
				toast.error(`Quantidade solicitada fora de estoque`);
				return;
			}

			existingProduct.amount = amount;
			setCart(updatedCart);
		} catch {
			toast.error('Erro na alteração de quantidade do produto');
		}
	};

	const addProduct = async (productId: number) => {
		try {
			const updatedCart = [...cart];
			const existingProduct = updatedCart.find(product => product.id === productId);
			const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

			const existingAmount = existingProduct?.amount ?? 0;
			const newAmount = existingAmount + 1;

			if (newAmount > stock.amount) {
				toast.error('Quantidade solicitada fora de estoque');
				return;
			}

			if (existingProduct) {
				existingProduct.amount = newAmount;
			} else {
				const { data: product } = await api.get<Product>(`/products/${productId}`);

				if (!product) {
					toast.error('Erro na adição do produto');
					return;
				}

				updatedCart.push({
					...product,
					amount: 1
				})
			}

			setCart(updatedCart);
		} catch {
			toast.error('Erro na adição do produto');
		}
	};

	const removeProduct = (productId: number) => {
		try {	
			const updatedCart = cart.filter(product => product.id !== productId);

			if (updatedCart.length === cart.length) {
				toast.error('Erro na remoção do produto');
				return;
			}

			setCart(updatedCart);
		} catch {
			toast.error('Erro na remoção do produto');
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
