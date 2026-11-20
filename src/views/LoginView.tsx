import { useEffect, useState, type ReactNode } from 'react';
import { Image, ImageBackground, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { FadeIn, SlideUpText, Tap } from '../components/motion';
import { NoticeBox, PrimaryButton, SelectField, Switcher, TextField } from '../components/ui';
import { useLayout } from '../hooks/useLayout';
import { useNotice } from '../hooks/useNotice';
import { api, errorMessage } from '../services/api';
import { styles } from '../theme';
import type { Role, School, User } from '../types';

type Mode = 'entrar' | 'cadastrar';
const modes: { value: Mode; label: string }[] = [
  { value: 'entrar', label: 'Entrar' },
  { value: 'cadastrar', label: 'Criar conta' },
];
const steps = ['Escolha no cardápio', 'Acompanhe o preparo', 'Retire e pague no balcão'];
// Os dois lados do app: o aluno pede; a atendente gerencia e informa.
const sides: { value: Role; title: string; text: string }[] = [
  { value: 'aluno', title: 'Aluno', text: 'Faça seu pedido' },
  { value: 'atendente', title: 'Atendente', text: 'Gerencie e informe' },
];

const photo = require('../../assets/cantina-balcao.jpg');
const photoLabel = 'Alunos sorrindo no balcão da cantina, com salgados na vitrine';

/** Logo do SENAI em branco (o azul original some sobre a foto escurecida). */
function SenaiLogo({ small = false }: { small?: boolean }) {
  return (
    <Image
      source={require('../../assets/senai-branco.png')}
      style={[styles.senaiLogo, small && styles.senaiLogoSmall]}
      resizeMode="contain"
      accessibilityLabel="SENAI"
    />
  );
}

export function LoginView({ message, onLogin }: { message: string; onLogin: (user: User) => void }) {
  const { wide } = useLayout();
  const { width, height } = useWindowDimensions();
  // A marca acompanha a largura da coluna: "Cantina" ocupa cerca de 4 vezes o tamanho da fonte.
  // 588 = margens (112) + espaço entre colunas (56) + painel (420).
  const wordSize = Math.max(72, Math.min(132, Math.floor((Math.min(width, 1320) - 588) / 4.1)));
  const [side, setSide] = useState<Role>('aluno');
  const [mode, setMode] = useState<Mode>('entrar');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [course, setCourse] = useState('');
  const [shift, setShift] = useState('');
  const [school, setSchool] = useState<School | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, showNotice] = useNotice(message);
  const staff = side === 'atendente';
  // Atendente não se cadastra: a conta é criada pela cantina.
  const registering = !staff && mode === 'cadastrar';

  // Cursos e turnos vêm do servidor, que é quem valida o cadastro.
  useEffect(() => {
    api.school().then(setSchool, () => {});
  }, []);

  const submit = async () => {
    // Conferência rápida para ajudar quem digita. A validação que vale é a do servidor.
    if (registering && name.trim().length < 2) return showNotice('Informe seu nome.');
    if (!username.trim()) return showNotice(staff ? 'Informe seu usuário.' : 'Informe sua matrícula.');
    if (registering && !course) return showNotice('Escolha seu curso.');
    if (registering && !shift) return showNotice('Escolha seu turno.');
    if (registering && password.length < 8) return showNotice('A senha precisa ter pelo menos 8 caracteres.');
    if (!password) return showNotice('Informe sua senha.');

    setSending(true);
    try {
      const user = registering
        ? await api.register({ name, username, password, course, shift })
        : await api.login(username, password, side);
      onLogin(user);
    } catch (error) {
      showNotice(errorMessage(error));
      setSending(false);
    }
  };

  const switchTo = (next: Mode) => {
    setMode(next);
    showNotice('');
  };

  const chooseSide = (next: Role) => {
    setSide(next);
    setMode('entrar');
    setUsername('');
    setPassword('');
    showNotice('');
  };

  const form = (
    <>
      <View accessibilityRole="radiogroup" accessibilityLabel="Quem está entrando" style={styles.roleCards}>
        {sides.map((option) => {
          const selected = option.value === side;
          return (
            <Tap
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => chooseSide(option.value)}
              style={[styles.roleCard, selected && styles.roleCardSelected]}
            >
              <Text style={[styles.roleTitle, selected && styles.roleTextSelected]}>{option.title}</Text>
              <Text style={[styles.roleText, selected && styles.roleTextSelected]}>{option.text}</Text>
            </Tap>
          );
        })}
      </View>
      <Text role="heading" style={styles.signInTitle}>
        {staff ? 'Área da cantina' : registering ? 'Crie sua conta' : 'Acesse sua conta'}
      </Text>
      <Text style={styles.signInText}>
        {staff
          ? 'Gerencie pedidos e cardápio e informe os alunos. A conta é criada pela cantina.'
          : registering
            ? `Cadastro para alunos do ${school?.name ?? 'SENAI'}, com a matrícula da escola.`
            : 'Entre com sua matrícula para fazer o pedido.'}
      </Text>
      {!staff && <Switcher options={modes} value={mode} onChange={switchTo} />}
      <View style={[styles.list, { gap: 14, marginTop: staff ? 0 : 16 }]}>
        {registering && (
          <TextField label="Nome" value={name} onChangeText={setName} autoComplete="name" textContentType="name" maxLength={60} />
        )}
        <TextField
          label={staff ? 'Usuário' : 'Matrícula'}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          maxLength={30}
        />
        {registering && (
          <>
            <SelectField
              label="Curso"
              value={course}
              placeholder={school ? 'Escolha seu curso' : 'Carregando cursos…'}
              options={school?.courses ?? []}
              onChange={setCourse}
            />
            <View style={styles.field}>
              <Text style={styles.label}>Turno</Text>
              <Switcher
                kind="radio"
                options={(school?.shifts ?? []).map((value) => ({ value, label: value }))}
                value={shift}
                onChange={setShift}
              />
            </View>
          </>
        )}
        <TextField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={registering ? 'new-password' : 'current-password'}
          textContentType={registering ? 'newPassword' : 'password'}
          maxLength={128}
          onSubmitEditing={submit}
        />
      </View>
      <View style={[styles.footer, { marginTop: 24 }]}>
        <NoticeBox notice={notice} />
        <PrimaryButton
          label={sending ? 'Aguarde…' : registering ? 'Criar conta' : staff ? 'Entrar na área da cantina' : 'Entrar'}
          onPress={submit}
          disabled={sending}
        />
      </View>
    </>
  );

  // A foto cobre a página inteira; a sombra em degradê fica entre a foto e o texto.
  const cover = (shade: ImageSourcePropType, children: ReactNode) => (
    <ImageBackground
      source={photo}
      style={[styles.cover, { minHeight: height }]}
      imageStyle={styles.coverFill}
      resizeMode="cover"
      accessibilityLabel={photoLabel}
    >
      <Image source={shade} style={styles.coverFill} resizeMode="stretch" />
      {children}
    </ImageBackground>
  );

  if (wide) {
    return cover(
      require('../../assets/sombra-lateral.png'),
      <View style={styles.coverWide}>
        <View style={styles.coverStory}>
          <FadeIn>
            <SenaiLogo />
          </FadeIn>
          <View>
            <SlideUpText
              text="Cantina"
              style={[styles.wordmark, { fontSize: wordSize, lineHeight: wordSize, letterSpacing: -wordSize * 0.02 }]}
            />
            <FadeIn delay={380}>
              <Text style={styles.coverHeadline}>Sem fila no intervalo.</Text>
            </FadeIn>
            <FadeIn delay={460}>
              <Text style={styles.coverBody}>Peça pelo celular ou pelo computador e retire no balcão do SENAI Alagoinhas.</Text>
            </FadeIn>
            <FadeIn delay={540} style={styles.coverSteps}>
              {steps.map((step, index) => (
                <View key={step} style={styles.coverStep}>
                  <Text style={styles.coverStepNumber}>{String(index + 1).padStart(2, '0')}</Text>
                  <Text style={styles.coverStepText}>{step}</Text>
                </View>
              ))}
            </FadeIn>
          </View>
        </View>
        <FadeIn delay={200} x={16} y={0} style={{ justifyContent: 'center' }}>
          <View style={styles.signInPanel}>{form}</View>
        </FadeIn>
      </View>,
    );
  }

  return cover(
    require('../../assets/sombra-inferior.png'),
    <View style={styles.coverNarrow}>
      <FadeIn>
        <SenaiLogo small />
      </FadeIn>
      <View style={styles.coverNarrowColumn}>
        <View>
          <SlideUpText text="Cantina" style={[styles.wordmark, styles.wordmarkSmall]} />
          <FadeIn delay={380}>
            <Text style={[styles.coverHeadline, styles.coverHeadlineSmall]}>Sem fila no intervalo.</Text>
          </FadeIn>
        </View>
        <FadeIn delay={200}>
          <View style={[styles.signInPanel, styles.signInPanelNarrow]}>{form}</View>
        </FadeIn>
      </View>
    </View>,
  );
}
