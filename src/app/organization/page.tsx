const presidentMessage = [
  '안녕하십니까. 군산시탁구협회장 강시원입니다.',
  '앞으로 군산시탁구협회가 한 걸음 더 성장하고, 회원 여러분이 즐겁고 편안하게 탁구를 즐길 수 있는 환경을 만들기 위해 최선을 다하겠습니다.',
  '무엇보다 회원 여러분의 목소리에 귀 기울이며, 소통과 화합을 바탕으로 함께 움직이는 협회를 만들어가겠습니다.',
  '혼자 만들어가는 협회가 아니라, 회원 여러분과 함께 만들어가는 군산시탁구협회가 될 수 있도록 성실히 뛰겠습니다.',
  '앞으로도 많은 관심과 협조를 부탁드립니다.',
  '감사합니다.',
];

export default function OrganizationPage() {
  return (
    <div className="siteShell pageContent associationPage">
      <section className="presidentGreeting">
        <span className="greetingEyebrow">인사말</span>
        <h1>회원과 함께 만들어가는 군산시탁구협회</h1>
        <div className="greetingBody">
          {presidentMessage.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="presidentSignature">
          <span>군산시탁구협회장</span>
          <strong>강시원 올림</strong>
        </div>
      </section>
    </div>
  );
}
