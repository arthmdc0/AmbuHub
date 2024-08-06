from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import time

# Caminho para o ChromeDriver
caminho_para_o_chromedriver = r'C:\Users\Artur Moreno\Desktop\teste\chromedriver\chromedriver.exe'

# Configura o serviço do ChromeDriver com o caminho específico
service = Service(executable_path=caminho_para_o_chromedriver)

# Configuração para rodar o navegador em modo headless (opcional)
chrome_options = Options()
# chrome_options.add_argument("--headless") # Descomente esta linha para rodar em modo headless

# Iniciar o WebDriver do Chrome
driver = webdriver.Chrome(service=service, options=chrome_options)

try:
    # Acessar a página inicial
    driver.get("http://localhost:3000/index.html")

    # Espera para garantir que a página carregou
    time.sleep(2)

    # Clicar no botão de login
    login_button = driver.find_element(By.ID, "login-button")
    login_button.click()

    # Espera para garantir que a página de login carregou
    time.sleep(2)

    # Encontrar os campos de email e senha
    email_input = driver.find_element(By.NAME, "email")
    password_input = driver.find_element(By.NAME, "password")

    # Preencher os campos de email e senha
    email_input.send_keys("teste@email.com")
    password_input.send_keys("1234")

    # Submeter o formulário de login
    login_form = driver.find_element(By.TAG_NAME, "form")
    login_form.submit()

    # Esperar um pouco para a página processar o login
    time.sleep(3)

    # Verificar se o login foi bem-sucedido
    # Modifique a condição de verificação de URL
    if driver.current_url == "http://localhost:3000/usuario_padrao":
        print("Teste de login passou: Login bem-sucedido.")
    else:
        print("Teste de login falhou: Não redirecionado para /usuario_padrao.")

except Exception as e:
    print(f"Erro durante o teste: {e}")

finally:
    # Fechar o navegador após o teste
    driver.quit()
