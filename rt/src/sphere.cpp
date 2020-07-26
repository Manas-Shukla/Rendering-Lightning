#include <sphere.hpp>

using namespace rt;

sphere_t::sphere_t(material_t* _mat):center(0.0,0.0,0.0),radius(1.0),mat(_mat) { }
sphere_t::sphere_t(material_t* _mat, Eigen::Vector3d _c, double _r): center(_c), radius(_r), mat(_mat) { }

sphere_t::~sphere_t() { }

bool sphere_t::intersect(hit_t& result, const ray_t& _ray) const
{
	Vector3d r2c = center - _ray.origin;
	const double b = r2c.dot(_ray.direction);
	double d = b*b - r2c.dot(r2c) + radius*radius;

	if (d < 0)
		return false;
	else
		d = sqrt(d);

	double t;

	t=b-d;
	if (!is_zero(t) && t>0.0)
	{
		result = hit_t(this, t);
	}
	else 
	{
		t = b+d;
		if (!is_zero(t)) 
			result = hit_t(this,t);
		else return false;
	}

	return t >= _ray.mint && t <= _ray.maxt;

}

Eigen::Vector3d sphere_t::get_normal(Eigen::Vector3d& _p) const
{
	Eigen::Vector3d normal = _p - center;
	normal.normalize();

	return normal;
}

material_t* sphere_t::get_material(void) const
{
	return mat;
}

bool sphere_t::inside(Eigen::Vector3d &pt) const{
	return ( ((pt-center).dot(pt-center))<= radius*radius );
}
void sphere_t::print(std::ostream &stream) const
{
	Eigen::IOFormat CommaInitFmt(Eigen::StreamPrecision, Eigen::DontAlignCols, ", ", ", ", "", "", "[ ", " ]");
	
	stream<<"Object Properties: -------------------------------"<<std::endl;
	stream<<"Type: Sphere"<<std::endl;
	stream<<"Center: "<<center.format(CommaInitFmt)<<std::endl;
	stream<<"Radius: "<<radius<<std::endl<<std::endl;
}

double sphere_t::get_tex_u(Vector3d &pt) const
{
	Vector3d pt_cn = pt - center;
	return atan2(pt_cn[1],pt_cn[0]+EPSILON)*INV_TWOPI + 0.5;
}

double sphere_t::get_tex_v(Vector3d &pt) const
{
	Vector3d pt_cn = pt - center;
	return INV_PI * acos(pt_cn[2]/radius);
}


