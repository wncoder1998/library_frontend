import { Button, Form, Input } from "antd";
import "./index.css";

const LOGIN_INITIAL_VALUES = {
  username: "admin",
  password: "12345678",
};

export default function Login() {
  return (
    <main className="login-page relative grid min-h-screen place-items-center overflow-hidden bg-[#f1f3f7] text-[#303642]">
      <div className="login-loading fixed top-8 right-10 h-6 w-6 opacity-75 lg:top-12 lg:right-16" aria-hidden="true" />

      <section
        className="relative z-10 w-[min(520px,calc(100vw-32px))] pt-14 sm:pt-16"
        aria-label="登录"
      >
        <img
          className="pointer-events-none absolute top-0 left-1/2 w-36 -translate-x-1/2 object-contain sm:w-40"
          src="/login-owl.png"
          alt=""
        />

        <div className="min-h-[430px] rounded-[22px] bg-white/95 px-10 pt-9 pb-12 shadow-[0_22px_48px_rgb(45_57_82/0.12),0_2px_8px_rgb(45_57_82/0.04)] sm:min-h-[470px] sm:px-14 sm:pt-10 sm:pb-14">
          <div className="mb-12 flex items-center justify-center gap-5 sm:mb-14" aria-label="V3 Admin">
            <span className="grid h-[74px] w-[74px] place-items-center rounded-full bg-[#2f86ff] font-[Comic_Sans_MS,Bradley_Hand,Segoe_Print,cursive] text-[38px] leading-none font-bold tracking-[-6px] text-[#1b2433] sm:h-20 sm:w-20 sm:text-[42px]">
              V3
            </span>
            <span className="font-[Comic_Sans_MS,Bradley_Hand,Segoe_Print,cursive] text-[46px] leading-none font-bold tracking-[1px] text-[#3c3c3c] sm:text-[52px]">
              Admin
            </span>
          </div>

          <Form
            className="login-form grid gap-4 sm:gap-5"
            initialValues={LOGIN_INITIAL_VALUES}
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item name="username">
              <Input className="login-input" placeholder="admin" prefix="♙" />
            </Form.Item>

            <Form.Item name="password">
              <Input.Password className="login-input" placeholder="密码" prefix="♙" />
            </Form.Item>

            <Form.Item name="captcha">
              <Input
                className="login-input login-captcha-input"
                placeholder="验证码"
                prefix="♙"
                suffix={<span className="login-captcha-code">V3Admin</span>}
              />
            </Form.Item>

            <Button className="login-submit mt-2" type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form>
        </div>
      </section>
    </main>
  );
}
