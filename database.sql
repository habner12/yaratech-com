-- Base de Datos para Sistema POS YARA
-- Generado para demostración en MySQL

CREATE DATABASE IF NOT EXISTS yara_pos;
USE yara_pos;

-- 1. Tabla de Proveedores
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    category VARCHAR(100),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Productos (Inventario)
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    image_url VARCHAR(500),
    supplier_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- 3. Tabla de Clientes
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    nit_ci VARCHAR(50) UNIQUE,
    address VARCHAR(500),
    sector VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Ventas (Cabecera)
CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    client_id INT,
    total_amount DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Completado',
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- 5. Tabla de Detalle de Ventas (Productos por venta)
CREATE TABLE sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT,
    product_id INT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- INSERCIÓN DE DATOS DE PRUEBA (DUMMY DATA)

-- Insertar Proveedores
INSERT INTO suppliers (id, name, contact_person, category, email) VALUES
(1, 'Samsung Electronics', 'Juan Carlos Mamani', 'Smartphones/TV', 'ventas@samsung.bo'),
(2, 'Xiaomi Bolivia', 'Elena Quispe', 'Gadgets', 'contacto@xiaomi.com.bo'),
(3, 'Sony Music & Tech', 'Roberto Gómez', 'Audio/Video', 'roberto@sony.bo'),
(4, 'Logitech Global', 'Maria Delgado', 'Accesorios', 'm.delgado@logitech.com');

-- Insertar Productos
INSERT INTO products (id, name, category, price, stock, image_url, supplier_id) VALUES
(1, 'Smartphone Pro X - 256GB', 'Celulares', 2499.00, 15, 'smartphone.png', 1),
(2, 'Tablet Pro 10" OLED', 'Tablets', 1850.00, 8, 'tablet.png', 1),
(3, 'Audífonos Bluetooth ANC', 'Audio', 580.00, 25, 'headphones.png', 3),
(4, 'Laptop Gamer RTX 4060', 'Laptops', 7200.00, 5, 'laptop.png', NULL),
(5, 'Smartwatch Series 7', 'Wearables', 1200.00, 12, 'https://images.unsplash.com/photo-1544117519-31a4b719223d', NULL),
(6, 'Monitor 4K UltraWide 34"', 'Monitores', 3450.00, 7, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf', NULL),
(7, 'Teclado Mecánico RGB', 'Accesorios', 450.00, 30, 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae', 4),
(8, 'Mouse Inalámbrico Pro', 'Accesorios', 280.00, 45, 'https://images.unsplash.com/photo-1527866959252-deab85ef7d1b', 4);

-- Insertar Clientes
INSERT INTO clients (id, name, nit_ci, address, sector) VALUES
(1, 'ElectroWorld S.A.', '1029384756', 'Av. 6 de Agosto', 'Retail'),
(2, 'Importadora Yungas', '4958673012', 'Calle Junín #45', 'Distribución'),
(3, 'Juan Pérez (Consumidor)', '1234567', 'Caranavi Centro', 'Independiente');

-- Insertar una Venta de ejemplo (Historial)
INSERT INTO sales (id, sale_date, client_id, total_amount, discount, payment_method, status) VALUES
(101, DATE_SUB(NOW(), INTERVAL 1 DAY), 1, 1200.00, 0.00, 'Tienda', 'Completado');

-- Insertar items de la venta de ejemplo
INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES
(101, 3, 2, 600.00, 1200.00); -- Simulando que el cliente compró 2 audífonos (precio ajustado para el ejemplo)
