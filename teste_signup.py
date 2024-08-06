from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# Caminho para o ChromeDriver
caminho_para_o_chromedriver = r'C:\Users\Artur Moreno\Desktop\teste\chromedriver\chromedriver.exe'
service = Service(executable_path=caminho_para_o_chromedriver)

chrome_options = Options()

driver = webdriver.Chrome(service=service, options=chrome_options)

try:
    driver.get("http://localhost:3000/index.html")
    time.sleep(0.5) 

    signup_button = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "signup-button"))
    )
    time.sleep(0.5)  
    
    # Clicar no botão de cadastro
    signup_button.click()
    time.sleep(0.5)  

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.NAME, "email"))
    )
    time.sleep(0.5)  

    # Encontrar os campos de email, confirmação de email, senha e confirmação de senha
    email_input = driver.find_element(By.NAME, "email")
    confirm_email_input = driver.find_element(By.NAME, "confirmEmail")
    password_input = driver.find_element(By.NAME, "password")
    confirm_password_input = driver.find_element(By.NAME, "confirmPassword")
    time.sleep(0.5)  # Intervalo de meio segundo

    # Preencher os campos com os dados
    email_input.send_keys("testeautomatico@email.com")
    time.sleep(0.5)  
    confirm_email_input.send_keys("testeautomatico@email.com")
    time.sleep(0.5)  
    password_input.send_keys("12345")
    time.sleep(0.5) 
    confirm_password_input.send_keys("12345")
    time.sleep(0.5)  

    # Submeter o formulário de cadastro
    signup_form = driver.find_element(By.TAG_NAME, "form")
    signup_form.submit()
    time.sleep(0.5)

    # Esperar um pouco para a página processar o cadastro e redirecionar para login
    WebDriverWait(driver, 10).until(
        EC.url_to_be("http://localhost:3000/login")
    )
    time.sleep(0.5)

    # Verificar se o cadastro foi bem-sucedido
    if driver.current_url == "http://localhost:3000/login":
        print("Teste de cadastro passou: Redirecionado para a página de login.")
    else:
        print("Teste de cadastro falhou: Não redirecionado para a página de login.")

except Exception as e:
    print(f"Erro durante o teste: {e}")

finally:
    driver.quit()
