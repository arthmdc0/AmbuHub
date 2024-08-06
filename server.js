const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { Sequelize, DataTypes } = require('sequelize');
const multer = require('multer');
const fs = require('fs');
const { engine } = require('express-handlebars');

const app = express();
const PORT = process.env.PORT || 3000;

// conectar ao PostgreSQL (Banco de Dados)
const sequelize = new Sequelize('ambuhub', 'postgres', '1234', {
  host: 'localhost',
  dialect: 'postgres',
});

// Autenticar
sequelize.authenticate()
  .then(() => console.log('Conectado ao PostgreSQL'))
  .catch(err => console.error('Não foi possível conectar ao PostgreSQL:', err));

// Definir modelo de usuário
const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'usuario_padrão',
  },
}, {
  tableName: 'users',
  timestamps: false,
});


const Product = sequelize.define('Product', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  tableName: 'products',
  timestamps: false,
});

// Sincronizar
sequelize.sync();


app.engine('handlebars', engine({
  extname: '.handlebars',
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));


app.post('/buy-product/:id', ensureAuthenticated, async (req, res) => {
  const productId = req.params.id;
  const { quantity, paymentMethod } = req.body;

  try {
    const product = await Product.findOne({ where: { id: productId } });
    if (!product) {
      return res.status(404).send('Produto não encontrado');
    }

    if (product.stock < quantity) {
      return res.status(400).send('Quantidade solicitada não disponível');
    }

   
    product.stock -= quantity;
    await product.save();

   
    res.send(`Compra realizada com sucesso! Método de pagamento: ${paymentMethod}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao processar compra');
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

function ensureAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

function checkUserRole(role) {
  return function (req, res, next) {
    if (req.session.userRole === role) {
      return next();
    }
    res.status(403).send('Acesso negado. Você não tem permissão para visualizar esta página.');
  };
}

// Rotas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});


app.get('/usuario_padrao', ensureAuthenticated, checkUserRole('usuario_padrão'), async (req, res) => {
  try {
    const products = await Product.findAll();
    res.render('usuario_padrao', { products });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar produtos');
  }
});

app.get('/usuario_ambulante', ensureAuthenticated, checkUserRole('usuario_ambulante'), async (req, res) => {
  try {
    const products = await Product.findAll({ where: { userId: req.session.userId } });
    res.render('usuario_ambulante', { products });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao buscar produtos do usuário');
  }
});

// Rota de cadastro de usuário
app.post('/signup', async (req, res) => {
  try {
    const { email, password, advertiser } = req.body;
    const role = advertiser === 'on' ? 'usuario_ambulante' : 'usuario_padrão';

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar novo usuário
    const user = await User.create({ email, password: hashedPassword, role });

    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao criar conta');
  }
});

// Rota de login de usuário
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuário no banco de dados
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).send('Usuário não encontrado');
    }

    // Comparar senha
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).send('Senha incorreta');
    }

    // Armazenar informações na sessão
    req.session.userId = user.id;
    req.session.userRole = user.role;

    // Redirecionar com base na role
    if (user.role === 'usuario_ambulante') {
      res.redirect('/usuario_ambulante');
    } else {
      res.redirect('/usuario_padrao');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao fazer login');
  }
});

// Rota para criação de produtos
app.post('/create-product', ensureAuthenticated, checkUserRole('usuario_ambulante'), upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    const imageUrl = req.file ? '/uploads/' + req.file.filename : null;

    await Product.create({
      name,
      description,
      price: parseFloat(price),
      stock: parseInt(stock),
      imageUrl,
      userId: req.session.userId,
    });

    res.redirect('/usuario_ambulante');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao criar produto');
  }
});

// Rota para deletar um produto
app.post('/delete-product/:id', ensureAuthenticated, checkUserRole('usuario_ambulante'), async (req, res) => {
  try {
    const productId = req.params.id;

    // Verificar se o produto pertence ao usuário
    const product = await Product.findOne({ where: { id: productId, userId: req.session.userId } });
    if (!product) {
      return res.status(404).send('Produto não encontrado ou você não tem permissão para deletá-lo');
    }

    // Deletar o produto
    await product.destroy();
    res.redirect('/usuario_ambulante');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao deletar produto');
  }
});

// Rota para editar um produto
app.post('/edit-product/:id', ensureAuthenticated, checkUserRole('usuario_ambulante'), upload.single('image'), async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, description, price, stock } = req.body;
    const product = await Product.findOne({ where: { id: productId, userId: req.session.userId } });

    if (!product) {
      return res.status(404).send('Produto não encontrado ou você não tem permissão para editá-lo');
    }

    // Atualizar o produto
    product.name = name;
    product.description = description;
    product.price = parseFloat(price);
    product.stock = parseInt(stock);

    if (req.file) {
      product.imageUrl = '/uploads/' + req.file.filename;
    }

    await product.save();
    res.redirect('/usuario_ambulante');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao editar produto');
  }
});

// Rota de logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Erro ao fazer logout');
    }
    res.redirect('/login');
  });
});

app.listen(PORT, () => {
  console.log(` http://localhost:${PORT}`);
});
